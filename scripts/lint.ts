#!/usr/bin/env bun
/**
 * TypeScript port of `scripts/lint.sh`.
 *
 * 1. Runs `biome check` (failing on ANY diagnostic — info, warn, or error).
 * 2. Runs the three check-* scripts (desktop-git-env, git-ref-strings,
 *    simple-git-usage).
 *
 * Args after `--` (or any args) are passed through to biome.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const BIOME_VERSION = "2.4.2";
const REPO_ROOT = resolve(import.meta.dir, "..");
const isWindows = process.platform === "win32";

function run(
	command: string,
	args: string[],
): { code: number; output: string } {
	const result = spawnSync(command, args, {
		cwd: REPO_ROOT,
		encoding: "utf8",
		shell: isWindows,
		// Capture stdout + stderr together (mirrors `2>&1` in the bash script).
		stdio: ["inherit", "pipe", "pipe"],
	});
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
	return { code: result.status ?? 1, output };
}

function runInherit(command: string, args: string[]): number {
	const result = spawnSync(command, args, {
		cwd: REPO_ROOT,
		stdio: "inherit",
		shell: isWindows,
	});
	return result.status ?? 1;
}

const biomeArgs = process.argv.slice(2);

// 1. Biome check.
const biome = run("bunx", [
	`@biomejs/biome@${BIOME_VERSION}`,
	"check",
	...biomeArgs,
]);
process.stdout.write(biome.output);

// Mirror bash behaviour: any "Found N error|warning|info" line is a failure.
let biomeFailed = biome.code !== 0;
if (/Found \d+ (error|info|warning)/.test(biome.output)) {
	biomeFailed = true;
}

// 2. Custom checks (run regardless of biome status so the user sees all issues).
const checks = [
	"scripts/check-desktop-git-env.ts",
	"scripts/check-git-ref-strings.ts",
	"scripts/check-simple-git-usage.ts",
];

let checksFailed = false;
for (const script of checks) {
	const status = runInherit("bun", ["run", script]);
	if (status !== 0) checksFailed = true;
}

process.exit(biomeFailed || checksFailed ? 1 : 0);
