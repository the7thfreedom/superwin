import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { NewWorkspaceModal } from "renderer/components/NewWorkspaceModal";
import { Paywall } from "renderer/components/Paywall";
import { useUpdateListener } from "renderer/components/UpdateToast";
import { useIsV2CloudEnabled } from "renderer/hooks/useIsV2CloudEnabled";
import { dragDropManager } from "renderer/lib/dnd";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { showWorkspaceAutoNameWarningToast } from "renderer/lib/workspaces/showWorkspaceAutoNameWarningToast";
import { InitGitDialog } from "renderer/react-query/projects/InitGitDialog";
import { AddRepositoryModals } from "renderer/routes/_authenticated/_dashboard/components/AddRepositoryModals";
import { DashboardNewWorkspaceModal } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal";
import { V1ImportModal } from "renderer/routes/_authenticated/components/V1ImportModal";
import { WorkspaceInitEffects } from "renderer/screens/main/components/WorkspaceInitEffects";
import { useSettingsStore } from "renderer/stores/settings-state";
import { useTabsStore } from "renderer/stores/tabs/store";
import { useAgentHookListener } from "renderer/stores/tabs/useAgentHookListener";
import { setPaneWorkspaceRunState } from "renderer/stores/tabs/workspace-run";
import { useWorkspaceInitStore } from "renderer/stores/workspace-init";
import {
	type DEFAULT_SETTINGS_PATH,
	NOTIFICATION_EVENTS,
} from "shared/constants";
import { AgentHooks } from "./components/AgentHooks";
import { FileMenuListener } from "./components/FileMenuListener";
import { GlobalBrowserLifecycle } from "./components/GlobalBrowserLifecycle";
import { TeardownLogsDialog } from "./components/TeardownLogsDialog";
import { V2NotificationController } from "./components/V2NotificationController";
import { createPierreWorker } from "./lib/pierreWorker";
import { CollectionsProvider } from "./providers/CollectionsProvider";
import { DeletingWorkspacesProvider } from "./providers/DeletingWorkspacesProvider";
import { LocalHostServiceProvider } from "./providers/LocalHostServiceProvider";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const setOriginRoute = useSettingsStore((s) => s.setOriginRoute);
	const utils = electronTrpc.useUtils();
	const shownWorkspaceInitWarningsRef = useRef(new Set<string>());
	const isV2CloudEnabled = useIsV2CloudEnabled();

	useAgentHookListener();
	useUpdateListener();

	// Update workspace-run pane state on terminal exit
	electronTrpc.notifications.subscribe.useSubscription(undefined, {
		onData: (event) => {
			if (
				event.type === NOTIFICATION_EVENTS.FOCUS_V2_NOTIFICATION_SOURCE &&
				event.data
			) {
				localStorage.setItem("lastViewedWorkspaceId", event.data.workspaceId);
				const source = event.data.source;
				void navigate({
					to: "/v2-workspace/$workspaceId",
					params: { workspaceId: event.data.workspaceId },
					search:
						source.type === "terminal"
							? {
									terminalId: source.id,
									focusRequestId: crypto.randomUUID(),
								}
							: {
									chatSessionId: source.id,
									focusRequestId: crypto.randomUUID(),
								},
				});
				return;
			}

			if (
				event.type !== NOTIFICATION_EVENTS.TERMINAL_EXIT ||
				!event.data?.paneId
			) {
				return;
			}
			const pane = useTabsStore.getState().panes[event.data.paneId];
			if (pane?.workspaceRun?.state === "running") {
				const nextState =
					event.data.reason === "killed"
						? "stopped-by-user"
						: "stopped-by-exit";
				setPaneWorkspaceRunState(event.data.paneId, nextState);
			}
		},
	});

	useEffect(() => {
		if (!location.pathname.startsWith("/settings")) {
			setOriginRoute(location.pathname);
		}
	}, [location.pathname, setOriginRoute]);

	// Workspace initialization progress subscription
	const updateInitProgress = useWorkspaceInitStore((s) => s.updateProgress);
	electronTrpc.workspaces.onInitProgress.useSubscription(undefined, {
		onData: (progress) => {
			updateInitProgress(progress);
			if (
				progress.warning &&
				!shownWorkspaceInitWarningsRef.current.has(progress.workspaceId)
			) {
				shownWorkspaceInitWarningsRef.current.add(progress.workspaceId);
				showWorkspaceAutoNameWarningToast({
					description: progress.warning,
					onOpenModelAuthSettings: () => {
						void navigate({ to: "/settings/models" });
					},
				});
			}
			if (progress.step === "ready" || progress.step === "failed") {
				// Invalidate both the grouped list AND the specific workspace
				utils.workspaces.getAllGrouped.invalidate();
				utils.workspaces.get.invalidate({ id: progress.workspaceId });
			}
		},
		onError: (error) => {
			console.error("[workspace-init-subscription] Subscription error:", error);
		},
	});

	// Menu navigation subscription
	electronTrpc.menu.subscribe.useSubscription(undefined, {
		onData: (event) => {
			if (event.type === "open-settings") {
				// "appearance" default: /settings/account was removed by the
				// cloud-strip (auth is stubbed in this fork).
				const section = event.data.section || "appearance";
				navigate({
					to: `/settings/${section}` as typeof DEFAULT_SETTINGS_PATH,
				});
			} else if (event.type === "open-workspace") {
				navigate({ to: `/workspace/${event.data.workspaceId}` });
			}
		},
	});

	return (
		<DndProvider manager={dragDropManager}>
			<CollectionsProvider>
				<GlobalBrowserLifecycle />
				<LocalHostServiceProvider>
					<DeletingWorkspacesProvider>
						<WorkerPoolContextProvider
							poolOptions={{ workerFactory: createPierreWorker, poolSize: 8 }}
							highlighterOptions={{ preferredHighlighter: "shiki-wasm" }}
						>
							<AgentHooks />
							<FileMenuListener />
							<V2NotificationController />
							<Outlet />
							<V1ImportModal />
							{/* Mounted here (not in _dashboard) so openNewProject() has a
							    host on every route its openers can fire from, e.g. the
							    new-workspace modal surviving a navigation to /settings. */}
							<AddRepositoryModals />
							<WorkspaceInitEffects />
							{isV2CloudEnabled ? (
								<DashboardNewWorkspaceModal />
							) : (
								<NewWorkspaceModal />
							)}
							<InitGitDialog />
							<TeardownLogsDialog />
							<Paywall />
						</WorkerPoolContextProvider>
					</DeletingWorkspacesProvider>
				</LocalHostServiceProvider>
			</CollectionsProvider>
		</DndProvider>
	);
}
