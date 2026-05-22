// Type-only stub kept for the desktop renderer. The cloud Postgres schema was removed.
// This shape mirrors the surviving fields consumed by the v2-workspace renderer code.
export type SelectV2Workspace = {
	id: string;
	name: string;
	projectId: string;
	hostId: string | null;
	type: "main" | "worktree";
	branch: string | null;
	path: string | null;
	createdAt: Date;
	updatedAt: Date;
	[key: string]: unknown;
};
