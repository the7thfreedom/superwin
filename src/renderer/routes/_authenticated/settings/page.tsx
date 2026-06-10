import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DEFAULT_SETTINGS_PATH } from "shared/constants";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	return <Navigate to={DEFAULT_SETTINGS_PATH} replace />;
}
