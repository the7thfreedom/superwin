/**
 * Workspace Service — Desktop Entry Point
 *
 * Starts the host-service HTTP server on a port assigned by the coordinator.
 * The coordinator polls health.check to know when it's ready.
 */

import { serve } from "@hono/node-server";
import {
	createApp,
	installProcessSafetyNet,
	LocalGitCredentialProvider,
} from "@superset/host-service";
import {
	initTerminalBaseEnv,
	resolveTerminalBaseEnv,
} from "@superset/host-service/terminal-env";
import { writeManifest } from "main/lib/host-service-manifest";
import { env } from "./env";

async function main(): Promise<void> {
	const terminalBaseEnv = await resolveTerminalBaseEnv();
	initTerminalBaseEnv(terminalBaseEnv);

	const { app, injectWebSocket } = createApp({
		config: {
			dbPath: env.HOST_DB_PATH,
			migrationsFolder: env.HOST_MIGRATIONS_FOLDER,
			allowedOrigins: [
				`http://localhost:${env.DESKTOP_VITE_PORT}`,
				`http://127.0.0.1:${env.DESKTOP_VITE_PORT}`,
			],
		},
		providers: {
			credentials: new LocalGitCredentialProvider(),
		},
	});

	const startedAt = Date.now();
	const server = serve(
		{ fetch: app.fetch, port: env.HOST_SERVICE_PORT, hostname: "127.0.0.1" },
		(info: { port: number }) => {
			installProcessSafetyNet();

			try {
				writeManifest({
					pid: process.pid,
					endpoint: `http://127.0.0.1:${info.port}`,
					authToken: env.HOST_SERVICE_SECRET,
					startedAt,
					organizationId: "local",
					spawnedByAppVersion: env.SUPERSET_APP_VERSION,
				});
			} catch (error) {
				console.error("[host-service] Failed to write manifest:", error);
			}
		},
	);
	injectWebSocket(server);

	const shutdown = () => {
		server.close();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

void main().catch((error) => {
	console.error("[host-service] Failed to start:", error);
	process.exit(1);
});
