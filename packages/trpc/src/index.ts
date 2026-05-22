// Type-only stub for the legacy cloud-side @superset/trpc package.
// All cloud routers were removed during the auth/cloud purge.
import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

export const appRouter = t.router({});
export type AppRouter = typeof appRouter;
export type RouterInputs = Record<string, never>;
export type RouterOutputs = Record<string, never>;
