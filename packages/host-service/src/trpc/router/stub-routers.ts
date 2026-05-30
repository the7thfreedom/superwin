// Stub routers for cloud-stripped host-service functionality (`auth`, `chat`,
// `pullRequests`). The concrete implementations were removed in the local-only
// build, but the renderer (`workspaceTrpc` / host-service clients) still calls
// these procedures. Inputs/outputs are intentionally loose so the renderer
// type-checks without reconstructing the full cloud schemas.
import { z } from "zod";
import { publicProcedure, router } from "../index";

const voidQuery = publicProcedure.query((): Record<string, any> => ({}));
const looseQuery = publicProcedure
	.input(z.any())
	.query((): Record<string, any> => ({}));
const looseMutation = publicProcedure
	.input(z.any())
	.mutation((): Record<string, any> => ({}));

// Slash-command list shape the renderer destructures.
type SlashCommandSummary = {
	name: string;
	aliases: string[];
	description: string;
	argumentHint: string;
};
const slashCommandsQuery = publicProcedure
	.input(z.any())
	.query((): SlashCommandSummary[] => []);

export const authRouter = router({
	getAnthropicStatus: voidQuery,
	getOpenAIStatus: voidQuery,
});

export const chatRouter = router({
	getSnapshot: looseQuery,
	getSlashCommands: slashCommandsQuery,
	sendMessage: looseMutation,
	stop: looseMutation,
	endSession: looseMutation,
	respondToApproval: looseMutation,
	respondToQuestion: looseMutation,
	respondToPlan: looseMutation,
	resolveSlashCommand: looseMutation,
	previewSlashCommand: looseMutation,
	restartFromMessage: looseMutation,
});

// PR rows the sidebar reads (`data.workspaces[].workspaceId` / `.pullRequest`).
type PullRequestWorkspaceRow = {
	workspaceId: string;
	pullRequest: Record<string, any>;
};
const pullRequestsByWorkspacesQuery = publicProcedure
	.input(z.any())
	.query((): { workspaces: PullRequestWorkspaceRow[] } => ({ workspaces: [] }));

export const pullRequestsRouter = router({
	getByWorkspaces: pullRequestsByWorkspacesQuery,
	refreshByWorkspaces: looseMutation,
});
