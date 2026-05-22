// Stub: cloud sidebar/preset schemas removed.
export type V2TerminalPresetRow = any;
export type ChangesViewMode = any;
export type ChangesFilter = any;
export type WorkspaceRunTerminalState = any;
export type V2SidebarSectionRow = any;
export type V2WorkspaceLocalStateRow = any;
export type V2UserPreferencesRow = any;
export type LinkTier = any;
export type LinkAction = any;
export type LinkTierMap = Record<string, any>;

export const V2_USER_PREFERENCES_ID = "default";

export const DEFAULT_V2_USER_PREFERENCES: any = {
	id: V2_USER_PREFERENCES_ID,
	fileLinks: {},
	urlLinks: {},
	sidebarFileLinks: {},
	rightSidebarOpen: false,
	rightSidebarTab: "chat",
	rightSidebarWidth: 360,
	deleteLocalBranch: false,
	showPresetsBar: true,
};
