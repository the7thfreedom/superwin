// Stub: paywall removed in local-only build.
import type { ReactNode } from "react";

export const GATED_FEATURES: Record<string, string> = {};

export const usePaywall: any = (): any => ({
	isGated: false,
	check: () => false,
	openPaywall: () => {},
});

export const Paywall = ({ children }: { children?: ReactNode }) =>
	children as any;
