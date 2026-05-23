// Stub: cloud-aware sidebar helpers removed.
export * from "./schema";

export const isSidebarWorkspaceVisible: any = (
	_workspace: any,
	_state?: any,
): boolean => true;
export const getVisibleSidebarWorkspaces: any = (
	workspaces: any,
	_state?: any,
): any[] => (Array.isArray(workspaces) ? workspaces : []);
export const getNextTabOrder: any = (_items?: any): number => 0;
export const getPrependTabOrder: any = (_items?: any): number => 0;
