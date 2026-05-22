import { deduplicateBranchName } from "./sanitize-branch";

const MAX_BRANCH_LENGTH = 100;

/**
 * Light sanitizer for AI-generated branch names — lowercase, kebab-case,
 * restricted character set. Differs from desktop's full sanitizer: no
 * multi-segment support (AI generates a single segment) and no preserve-case
 * options.
 */
function sanitizeGeneratedBranchName(raw: string): string {
	return raw
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9._+@-]/g, "")
		.replace(/\.{2,}/g, ".")
		.replace(/-+/g, "-")
		.replace(/\.lock$/g, "")
		.slice(0, MAX_BRANCH_LENGTH)
		.replace(/^[-.]+|[-.]+$/g, "");
}

export async function generateBranchNameFromPrompt(
	_prompt: string,
	_existingBranches: string[],
): Promise<string | null> {
	// AI-driven branch naming used the cloud chat model provider, which was
	// removed. Callers fall back to non-AI naming when this returns null.
	void deduplicateBranchName;
	void sanitizeGeneratedBranchName;
	void MAX_BRANCH_LENGTH;
	return null;
}
