import { createNodeWebSocket } from "@hono/node-ws";
import { trpcServer } from "@hono/trpc-server";
import { Octokit } from "@octokit/rest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb, type HostDb } from "./db";
import { EventBus, GitWatcher, registerEventBusRoute } from "./events";
import { WorkspaceFilesystemManager } from "./runtime/filesystem";
import type { GitCredentialProvider } from "./runtime/git";
import { createGitFactory } from "./runtime/git";
import { registerWorkspaceTerminalRoute } from "./terminal/terminal";
import { appRouter } from "./trpc/router";
import {
	execGh as defaultExecGh,
	type ExecGh,
} from "./trpc/router/workspace-creation/utils/exec-gh";

/**
 * Cloud API client was removed. Provide a chainable proxy whose terminal
 * `.query()` / `.mutate()` calls reject — any router still calling
 * `ctx.api.*.query(...)` will fail at runtime with a clear error, while
 * `if (!ctx.api)` guards still skip cleanly when callers check first.
 */
function createCloudApiStub(): unknown {
	const terminal = () =>
		Promise.reject(
			new Error(
				"CLOUD_REMOVED: the cloud tRPC API was removed from this build.",
			),
		);
	const handler: ProxyHandler<object> = {
		get(_target, prop) {
			if (prop === "query" || prop === "mutate") return terminal;
			if (prop === "then") return undefined; // not thenable
			return new Proxy({}, handler);
		},
	};
	return new Proxy({}, handler);
}
const cloudApiStub = createCloudApiStub();

export interface CreateAppOptions {
	config: {
		dbPath: string;
		migrationsFolder: string;
		allowedOrigins: string[];
	};
	providers: {
		credentials: GitCredentialProvider;
	};
	/**
	 * Test-harness override hooks. Production never sets these — `createApp`
	 * builds each subsystem itself when omitted.
	 */
	db?: HostDb;
	github?: () => Promise<Octokit>;
	execGh?: ExecGh;
}

export interface CreateAppResult {
	app: Hono;
	injectWebSocket: ReturnType<typeof createNodeWebSocket>["injectWebSocket"];
	dispose: () => Promise<void>;
}

export function createApp(options: CreateAppOptions): CreateAppResult {
	const { config, providers } = options;

	const db = options.db ?? createDb(config.dbPath, config.migrationsFolder);
	const git = createGitFactory(providers.credentials);
	const github =
		options.github ??
		(async () => {
			const token = await providers.credentials.getToken("github.com");
			if (!token) {
				throw new Error(
					"No GitHub token available. Set GITHUB_TOKEN/GH_TOKEN or authenticate via git credential manager.",
				);
			}
			return new Octokit({ auth: token });
		});
	const execGh: ExecGh = options.execGh ?? defaultExecGh;

	const filesystem = new WorkspaceFilesystemManager({ db });
	const gitWatcher = new GitWatcher(db, filesystem);
	gitWatcher.start();

	const runtime = { filesystem };
	const app = new Hono();
	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.use(
		"*",
		cors({
			origin: config.allowedOrigins,
			allowHeaders: ["Content-Type", "Authorization", "trpc-accept"],
		}),
	);

	const eventBus = new EventBus({ db, filesystem, gitWatcher });
	eventBus.start();

	registerEventBusRoute({ app, eventBus, upgradeWebSocket });
	registerWorkspaceTerminalRoute({
		app,
		db,
		eventBus,
		upgradeWebSocket,
	});

	app.use(
		"/trpc/*",
		trpcServer({
			router: appRouter,
			createContext: async () => {
				return {
					git,
					github,
					execGh,
					api: cloudApiStub,
					db,
					runtime,
					eventBus,
					organizationId: "local",
					// Localhost-only host service; no auth gate.
					isAuthenticated: true,
				} as Record<string, unknown>;
			},
		}),
	);

	const ownsDb = options.db === undefined;
	const dispose = async (): Promise<void> => {
		try {
			eventBus.close();
		} catch (err) {
			console.warn("[host-service] eventBus.close failed:", err);
		}
		try {
			gitWatcher.close();
		} catch (err) {
			console.warn("[host-service] gitWatcher.close failed:", err);
		}
		try {
			await filesystem.close();
		} catch (err) {
			console.warn("[host-service] filesystem.close failed:", err);
		}
		if (ownsDb) {
			try {
				(db as { $client?: { close?: () => void } }).$client?.close?.();
			} catch (err) {
				console.warn("[host-service] db.close failed:", err);
			}
		}
	};

	return { app, injectWebSocket, dispose };
}
