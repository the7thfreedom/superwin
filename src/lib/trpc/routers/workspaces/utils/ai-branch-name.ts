// AI-driven branch naming used @superset/chat which was removed; this is now
// a stub. Callers fall back to non-AI naming when this returns null.

export async function generateBranchNameFromPrompt(
	_prompt: string,
	_existingBranches: string[],
	_branchPrefix?: string,
): Promise<string | null> {
	return null;
}
