#!/usr/bin/env bun
/**
 * TypeScript port of `scripts/check-simple-git-usage.sh`.
 *
 * Forbids direct simple-git imports / construction outside the approved
 * wrappers in `src/lib/trpc/routers/workspaces/utils/git-client.ts` and
 * `packages/host-service/src/runtime/git/simple-git.ts`.
 */

import { runRules, repoRoot, type Rule } from "./lint-helpers";

const COMMON_EXCLUDES = [
	"**/*.test.ts",
	"**/*.bench.ts",
	"**/test/**",
	"src/lib/trpc/routers/workspaces/utils/git-client.ts",
	"packages/host-service/src/runtime/git/simple-git.ts",
	"node_modules/**",
	"scripts/**",
];

const INCLUDE = ["src/**/*.ts", "src/**/*.tsx", "packages/**/*.ts"];

const rules: Rule[] = [
	{
		message:
			"[simple-git] Direct runtime imports from simple-git are forbidden. " +
			"Use src/lib/trpc/routers/workspaces/utils/git-client.ts or " +
			"packages/host-service runtime/git/simple-git.ts.",
		// Multi-line `import { ... } from "simple-git"` — needs whole-file scan.
		pattern: /import(?!\s+type\b)[^;]*from\s*['"]simple-git['"]/s,
		include: INCLUDE,
		exclude: COMMON_EXCLUDES,
		multiline: true,
	},
	{
		message:
			'[simple-git] require("simple-git") is forbidden outside tests and approved wrappers.',
		pattern: /\brequire\(\s*['"]simple-git['"]\s*\)/,
		include: INCLUDE,
		exclude: COMMON_EXCLUDES,
	},
	{
		message:
			"[simple-git] Direct simpleGit(...) construction is forbidden outside tests and approved wrappers.",
		pattern: /\bsimpleGit\(/,
		include: INCLUDE,
		exclude: COMMON_EXCLUDES,
	},
];

const failed = await runRules(rules, repoRoot());
process.exit(failed > 0 ? 1 : 0);
