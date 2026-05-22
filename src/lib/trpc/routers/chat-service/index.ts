import { router } from "../..";

/**
 * Chat service was removed alongside @superset/chat/server/desktop and the
 * auth/cloud purge. Keep an empty router so existing trpc references compile.
 */
export const createChatServiceRouter = () => router({});

export type ChatServiceDesktopRouter = ReturnType<
	typeof createChatServiceRouter
>;
