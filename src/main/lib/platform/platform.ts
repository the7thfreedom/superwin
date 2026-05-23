/**
 * Platform abstraction layer — singleton selector.
 *
 * Import sites should write:
 *
 *     import { platform } from "main/lib/platform";
 *
 * The selector picks the adapter at first import based on `process.platform`.
 * `setPlatformForTesting` allows test suites to swap the adapter without
 * mutating `process.platform`.
 */

import { darwinAdapter } from "./darwinAdapter";
import { linuxAdapter } from "./linuxAdapter";
import type { PlatformAdapter, PlatformId } from "./types";
import { win32Adapter } from "./win32Adapter";

function selectAdapter(id: NodeJS.Platform): PlatformAdapter {
	switch (id) {
		case "darwin":
			return darwinAdapter;
		case "win32":
			return win32Adapter;
		default:
			return linuxAdapter;
	}
}

let active: PlatformAdapter = selectAdapter(process.platform);

export const platform: PlatformAdapter = new Proxy({} as PlatformAdapter, {
	get(_target, prop) {
		// All field reads delegate to the active adapter. Using a Proxy keeps
		// `setPlatformForTesting` honest — tests don't have to re-import the
		// `platform` constant after swapping the adapter.
		return Reflect.get(active, prop, active);
	},
});

/**
 * Replace the active platform adapter. Test-only.
 *
 * Returns a restore function that resets to the previous adapter.
 */
export function setPlatformForTesting(
	id: PlatformId | PlatformAdapter,
): () => void {
	const previous = active;
	active = typeof id === "string" ? selectAdapter(id) : id;
	return () => {
		active = previous;
	};
}

export type {
	CliShimResult,
	DefaultShellSpec,
	IpcEndpoint,
	IpcEndpointName,
	KillTreeResult,
	PlatformAdapter,
	PlatformId,
	TreeKillSignal,
} from "./types";
