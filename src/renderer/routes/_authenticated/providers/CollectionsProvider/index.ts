// Stub: cloud collections provider removed. Local-only empty Collections.
import { type Collection, createCollection, localOnlyCollectionOptions } from "@tanstack/db";
import type { ReactNode } from "react";

// Permissive row shape. The cloud-strip removed the per-collection schemas, so
// we can no longer infer concrete row types. Using an index-signature row
// (instead of `any`/`object`) keeps the TanStack DB query builder's ref-proxy
// property access (`.select`/`.where` callbacks) type-checkable: `keyof` of an
// index signature is `string | number`, so arbitrary field access resolves to
// `unknown` rather than failing with TS2339.
type CollectionRow = Record<string, any>;
type StubCollection = Collection<CollectionRow>;

const makeCollection = (id: string): StubCollection =>
	createCollection(
		localOnlyCollectionOptions<CollectionRow>({
			id,
			getKey: (item) => (item as { id?: string })?.id ?? "",
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

type CollectionName = (typeof COLLECTION_NAMES)[number];

export type AppCollections = Record<CollectionName, StubCollection> & {
	isLoading: boolean;
};

let cached: AppCollections | null = null;
const buildCollections = (): AppCollections => {
	if (cached) return cached;
	const next = { isLoading: false } as AppCollections;
	for (const name of COLLECTION_NAMES) {
		next[name] = makeCollection(`stub-${name}`);
	}
	cached = next;
	return cached;
};

export const useCollections = (): AppCollections => buildCollections();

export const CollectionsProvider = ({ children }: { children?: ReactNode }) =>
	children as ReactNode;
