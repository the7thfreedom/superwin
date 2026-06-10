import type { ModelOption } from "renderer/components/Chat/ChatInterface/types";
import { env } from "renderer/env.renderer";
import { MOCK_ORG_ID } from "shared/constants";

export const DEV_CHAT_MODELS: ModelOption[] = [
	{
		id: "anthropic/claude-opus-4-7",
		name: "Opus 4.7",
		provider: "Anthropic",
	},
	{
		id: "anthropic/claude-opus-4-6",
		name: "Opus 4.6",
		provider: "Anthropic",
	},
	{
		id: "anthropic/claude-sonnet-4-6",
		name: "Sonnet 4.6",
		provider: "Anthropic",
	},
	{
		id: "anthropic/claude-haiku-4-5",
		name: "Haiku 4.5",
		provider: "Anthropic",
	},
	{
		id: "openai/gpt-5.5",
		name: "GPT-5.5",
		provider: "OpenAI",
	},
	{
		id: "openai/gpt-5.4",
		name: "GPT-5.4",
		provider: "OpenAI",
	},
	{
		id: "openai/gpt-5.3-codex",
		name: "GPT-5.3 Codex",
		provider: "OpenAI",
	},
];

export function isDesktopChatDevMode(isLocalOnly = env.IS_LOCAL_ONLY): boolean {
	return isLocalOnly;
}

export function resolveDesktopChatOrganizationId(
	activeOrganizationId: string | null | undefined,
	isLocalOnly = env.IS_LOCAL_ONLY,
): string | null {
	if (isLocalOnly) return MOCK_ORG_ID;
	return activeOrganizationId ?? null;
}

export function isDesktopChatSessionReady({
	sessionId,
	hasPersistedSession,
	isLocalOnly = env.IS_LOCAL_ONLY,
}: {
	sessionId: string | null;
	hasPersistedSession: boolean;
	isLocalOnly?: boolean;
}): boolean {
	if (isLocalOnly) return Boolean(sessionId);
	return hasPersistedSession;
}

export function getDesktopChatModelOptions(
	isLocalOnly = env.IS_LOCAL_ONLY,
): ModelOption[] {
	return isLocalOnly ? DEV_CHAT_MODELS : [];
}
