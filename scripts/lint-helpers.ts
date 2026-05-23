#!/usr/bin/env bun
/**
 * Cross-platform helpers for the `scripts/check-*.ts` and `scripts/lint.ts`
 * runners. Replaces the original bash + ripgrep pipeline so it works on
 * Windows without WSL or `rg` on PATH.
 *
 * A "rule" scans a set of glob-matched files for a regex pattern. Matches are
 * reported with `file:line: snippet` and counted as a violation.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Glob } from "bun";

export interface Rule {
	/** Human-readable violation message printed once if any match is found. */
	message: string;
	/** Regex applied per line (or per file, see `multiline`). */
	pattern: RegExp;
	/** Glob patterns of files to scan, relative to `rootDir`. */
	include: string[];
	/** Glob patterns of files to exclude. */
	exclude?: string[];
	/**
	 * If true, runs the regex against the whole file body so multi-line
	 * constructs (e.g. multi-line `import { ... } from "simple-git"`) can match.
	 * Otherwise the regex runs line-by-line, which is faster and gives precise
	 * line numbers.
	 */
	multiline?: boolean;
}

function matchesAny(file: string, matchers: Glob[]): boolean {
	return matchers.some((m) => m.match(file));
}

async function collectFiles(
	rootDir: string,
	include: string[],
	exclude: string[],
): Promise<string[]> {
	const excludeMatchers = exclude.map((g) => new Glob(g));
	const seen = new Set<string>();
	for (const includeGlob of include) {
		const glob = new Glob(includeGlob);
		for await (const file of glob.scan({
			cwd: rootDir,
			dot: false,
			onlyFiles: true,
		})) {
			if (matchesAny(file, excludeMatchers)) continue;
			seen.add(file);
		}
	}
	return [...seen];
}

function offsetToLine(content: string, offset: number): number {
	let line = 1;
	for (let i = 0; i < offset && i < content.length; i++) {
		if (content.charCodeAt(i) === 0x0a) line++;
	}
	return line;
}

async function applyRule(rule: Rule, rootDir: string): Promise<string[]> {
	const files = await collectFiles(rootDir, rule.include, rule.exclude ?? []);
	const violations: string[] = [];
	for (const file of files) {
		const abs = resolve(rootDir, file);
		const content = await readFile(abs, "utf8");
		if (rule.multiline) {
			const re = new RegExp(rule.pattern.source, `${rule.pattern.flags}g`);
			let match: RegExpExecArray | null = re.exec(content);
			while (match !== null) {
				const line = offsetToLine(content, match.index);
				const snippet = content
					.slice(match.index, match.index + match[0].length)
					.split(/\r?\n/)[0]
					?.trim();
				violations.push(`${file}:${line}: ${snippet ?? match[0]}`);
				if (re.lastIndex === match.index) re.lastIndex++;
				match = re.exec(content);
			}
		} else {
			const lines = content.split(/\r?\n/);
			for (let i = 0; i < lines.length; i++) {
				if (rule.pattern.test(lines[i] ?? "")) {
					violations.push(`${file}:${i + 1}: ${(lines[i] ?? "").trim()}`);
				}
			}
		}
	}
	return violations;
}

/**
 * Run all rules and return the number of rules that reported violations.
 * Prints violations to stderr. Caller should `process.exit(count > 0 ? 1 : 0)`.
 */
export async function runRules(
	rules: Rule[],
	rootDir: string,
): Promise<number> {
	let failedRules = 0;
	for (const rule of rules) {
		const violations = await applyRule(rule, rootDir);
		if (violations.length > 0) {
			console.error(rule.message);
			for (const v of violations) console.error(v);
			console.error();
			failedRules++;
		}
	}
	return failedRules;
}

export function repoRoot(): string {
	return resolve(import.meta.dir, "..");
}
