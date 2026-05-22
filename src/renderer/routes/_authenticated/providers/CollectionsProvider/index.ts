// Stub: cloud collections provider removed. Local-only empty Collections.
import { createCollection, localOnlyCollectionOptions } from "@tanstack/db";
import type { ReactNode } from "react";

export type AppCollections = any;

const makeCollection = (id: string): any =>
	createCollection(
		localOnlyCollectionOptions<any>({
			id,
			getKey: (item: any) => item?.id ?? "",
		}),
	);

const COLLECTION_NAMES = [
	"agentCommands",
	"automations",
	"chatSessions",
	"githubPullRequests",
	"githubRepositories",
	"members",
	"projects",
	"tasks",
	"taskStatuses",
	"users",
	"v2Hosts",
	"v2Projects",
	"v2SidebarProjects",
	"v2SidebarSections",
	"v2TerminalPresets",
	"v2UserPreferences",
	"v2UsersHosts",
	"v2WorkspaceLocalState",
	"v2Workspaces",
	"workspaces",
] as const;

let cached: any = null;
const buildCollections = (): any => {
	if (cached) return cached;
	cached = {};
	for (const name of COLLECTION_NAMES) {
		cached[name] = makeCollection(`stub-${name}`);
	}
	cached.isLoading = false;
	return cached;
};

export const useCollections: any = (): any => buildCollections();

export const CollectionsProvider = ({ children }: { children?: ReactNode }) =>
	children as any;
