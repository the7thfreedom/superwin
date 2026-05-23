#!/usr/bin/env bun
/**
 * TypeScript port of `scripts/check-git-ref-strings.sh`.
 *
 * Forbids string-prefix checks against `origin/...` shortnames anywhere
 * outside the git-refs module. See packages/host-service/GIT_REFS.md.
 *
 * Why this exists: a local branch can legitimately be named `origin/foo`,
 * so `ref.startsWith("origin/")` misclassifies it as remote-tracking.
 * The fix is to use the discriminated `ResolvedRef` from
 * packages/host-service/src/runtime/git/refs.ts instead of inferring kind
 * from a refname string.
 */

import { type Rule, repoRoot, runRules } from "./lint-helpers";

// V1 desktop tRPC routers (src/lib/trpc/routers/**) are out of scope for this
// rule — see GIT_REFS.md "Open questions" for the v1 cleanup follow-up.
const V1_EXCLUDE = "src/lib/trpc/routers/**";
const REFS_FILE = "packages/host-service/src/runtime/git/refs.ts";

const rules: Rule[] = [
	{
		message:
			"[git-refs] '.startsWith(\"origin/\")' is forbidden — a local branch " +
			"can be named 'origin/foo' and would be misclassified. Use ResolvedRef " +
			"from @superset/host-service/git.",
		pattern: /\.startsWith\(\s*['"]origin\//,
		include: ["**/*.ts", "**/*.tsx"],
		exclude: [
			"**/*.test.ts",
			REFS_FILE,
			V1_EXCLUDE,
			"node_modules/**",
			"scripts/**",
		],
	},
	{
		message:
			"[git-refs] '.replace(\"origin/\", ...)' is forbidden — same " +
			"misclassification risk. Use ResolvedRef.shortName / .remote instead.",
		pattern: /\.replace\(\s*['"]origin\//,
		include: ["**/*.ts", "**/*.tsx"],
		exclude: [
			"**/*.test.ts",
			REFS_FILE,
			V1_EXCLUDE,
			"node_modules/**",
			"scripts/**",
		],
	},
];

const failed = await runRules(rules, repoRoot());
process.exit(failed > 0 ? 1 : 0);
