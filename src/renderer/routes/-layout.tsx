import { Alerter } from "@superset/ui/atoms/Alert";
import type { ReactNode } from "react";
import { PostHogSurfaceTagger } from "renderer/components/PostHogSurfaceTagger";
import { TelemetrySync } from "renderer/components/TelemetrySync";
import { ThemedToaster } from "renderer/components/ThemedToaster";
import { ElectronTRPCProvider } from "renderer/providers/ElectronTRPCProvider";
import { PostHogProvider } from "renderer/providers/PostHogProvider";

export function RootLayout({ children }: { children: ReactNode }) {
	return (
		<PostHogProvider>
			<ElectronTRPCProvider>
				<PostHogSurfaceTagger />
				<TelemetrySync />
				{children}
				<ThemedToaster />
				<Alerter />
			</ElectronTRPCProvider>
		</PostHogProvider>
	);
}
