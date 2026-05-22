import type { Octokit } from "@octokit/rest";
import type { HostDb } from "./db";
import type { EventBus } from "./events";
import type { WorkspaceFilesystemManager } from "./runtime/filesystem";
import type { GitFactory } from "./runtime/git";
import type { ExecGh } from "./trpc/router/workspace-creation/utils/exec-gh";

export interface HostServiceRuntime {
	filesystem: WorkspaceFilesystemManager;
}

/**
 * Cloud API client stub. The legacy cloud tRPC API was removed during the
 * auth/cloud purge — this is a chainable proxy whose terminal `.query()` /
 * `.mutate()` calls throw `CLOUD_REMOVED`. Existing cloud-sync code paths
 * still compile, but throw if reached. Wrap calls in try/catch or guard
 * with feature flags to make them no-ops.
 */
// biome-ignore lint/suspicious/noExplicitAny: cloud-removed stub surface
export type ApiClientStub = any;

export interface HostServiceContext {
	git: GitFactory;
	github: () => Promise<Octokit>;
	execGh: ExecGh;
	api: ApiClientStub;
	db: HostDb;
	runtime: HostServiceRuntime;
	eventBus: EventBus;
	organizationId: string;
	isAuthenticated: boolean;
}
