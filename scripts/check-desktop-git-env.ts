#!/usr/bin/env bun
/**
 * TypeScript port of `scripts/check-desktop-git-env.sh`.
 *
 * Forbids direct simple-git usage and raw `git` execFile calls outside the
 * approved wrapper. See AGENTS.md and the original bash script for context.
 */

import { runRules, repoRoot, type Rule } from "./lint-helpers";

const COMMON_EXCLUDE_TEST = "**/*.test.ts";
const GIT_CLIENT_PATH = "src/lib/trpc/routers/workspaces/utils/git-client.ts";

const rules: Rule[] = [
	{
		message:
			"[desktop-git-env] Direct runtime imports from simple-git are forbidden. " +
			"Use getSimpleGitWithShellPath from workspaces/utils/git-client.ts.",
		pattern: /^import(?!\s+type\b).*['"]simple-git['"]/,
		include: ["src/**/*.ts", "src/**/*.tsx"],
		exclude: [COMMON_EXCLUDE_TEST, GIT_CLIENT_PATH],
	},
	{
		message:
			"[desktop-git-env] Direct simpleGit(...) construction is forbidden outside git-client.ts.",
		pattern: /\bsimpleGit\(/,
		include: ["src/**/*.ts", "src/**/*.tsx"],
		exclude: [COMMON_EXCLUDE_TEST, GIT_CLIENT_PATH],
	},
	{
		message:
			"[desktop-git-env] Raw execFile/execFileAsync git calls are forbidden. " +
			"Use execGitWithShellPath from workspaces/utils/git-client.ts.",
		pattern: /\bexecFile(?:Async)?\(\s*['"]git['"]/,
		include: ["src/**/*.ts", "src/**/*.tsx"],
		exclude: [COMMON_EXCLUDE_TEST, GIT_CLIENT_PATH],
	},
	{
		message:
			"[desktop-git-env] execWithShellEnv(\"git\", ...) is forbidden. " +
			"Use execGitWithShellPath from workspaces/utils/git-client.ts.",
		pattern: /\bexecWithShellEnv\(\s*['"]git['"]/,
		include: ["src/**/*.ts", "src/**/*.tsx"],
		exclude: [COMMON_EXCLUDE_TEST],
	},
];

const failed = await runRules(rules, repoRoot());
process.exit(failed > 0 ? 1 : 0);
