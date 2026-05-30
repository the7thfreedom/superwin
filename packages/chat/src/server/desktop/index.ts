// Stub: cloud desktop entry removed in local-only build. Minimal exports so
// chat-service-provider and runtime still type-check.
//
// `ChatServiceRouter` is reconstructed as a permissive tRPC router so the
// renderer's `createTRPCReact<ChatServiceRouter>()` proxy resolves to a real
// client (with `.auth`/`.workspace` sub-routers) instead of the
// "router collides with built-in method" error union you get from `any`.
// Inputs/outputs are intentionally loose (`z.any()` / `Record<string, any>`)
// because the concrete cloud schemas were stripped.
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

export const desktop: any = {};
export type DesktopChatServer = any;
export default desktop;

const t = initTRPC.create({ transformer: superjson });

// Query with no input (called as `.useQuery()` with no args).
const voidQuery = t.procedure.query((): Record<string, any> => ({}));
// Query that accepts a loose input (called as `.useQuery(input)`).
const looseQuery = t.procedure
	.input(z.any())
	.query((): Record<string, any> => ({}));
// Slash-command list query. Typed to the shape consumers destructure
// (`name`/`aliases`/`description`/`argumentHint`).
type SlashCommandSummary = {
	name: string;
	aliases: string[];
	description: string;
	argumentHint: string;
};
const slashCommandsQuery = t.procedure.query((): SlashCommandSummary[] => []);
const looseMutation = t.procedure
	.input(z.any())
	.mutation((): Record<string, any> => ({}));
// Mutation with no input (called as `.mutate()` / `.mutateAsync()` with no args).
const voidMutation = t.procedure.mutation((): Record<string, any> => ({}));

const authRouter = t.router({
	getAnthropicStatus: voidQuery,
	getOpenAIStatus: voidQuery,
	consumeOpenAIOAuthCallback: voidQuery,
	setAnthropicApiKey: looseMutation,
	clearAnthropicApiKey: voidMutation,
	setOpenAIApiKey: looseMutation,
	clearOpenAIApiKey: voidMutation,
	startAnthropicOAuth: voidMutation,
	completeAnthropicOAuth: looseMutation,
	cancelAnthropicOAuth: voidMutation,
	disconnectAnthropicOAuth: voidMutation,
	startOpenAIOAuth: voidMutation,
	completeOpenAIOAuth: looseMutation,
	cancelOpenAIOAuth: voidMutation,
	disconnectOpenAIOAuth: voidMutation,
});

const workspaceRouter = t.router({
	searchFiles: looseQuery,
	resolveSlashCommand: looseMutation,
	previewSlashCommand: looseQuery,
	getMcpOverview: looseQuery,
	getSlashCommands: slashCommandsQuery,
});

export const chatServiceRouter = t.router({
	auth: authRouter,
	workspace: workspaceRouter,
});

export type ChatServiceRouter = typeof chatServiceRouter;
