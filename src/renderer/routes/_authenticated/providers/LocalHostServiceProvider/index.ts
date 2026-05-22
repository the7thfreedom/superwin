// Stub: cloud host-service provider removed. Local-only.
import type { ReactNode } from "react";

export const useLocalHostService: any = (): any => ({
	host: null,
	hostId: null,
	hostUrl: null,
	isLocal: true,
	isAuthenticated: true,
	status: "ready",
	client: null,
});

export const LocalHostServiceProvider = ({ children }: { children?: ReactNode }) => children as any;
