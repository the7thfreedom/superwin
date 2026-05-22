/**
 * macOS implementation of `PlatformAdapter`.
 *
 * This adapter encodes today's behavior verbatim — no behavior changes are
 * introduced in Milestone 1. Existing call sites are migrated to use the
 * adapter in later milestones; until then, the only consumer is the unit-test
 * suite that asserts the adapter mirrors the old logic.
 */

import { type ChildProcess, execFile } from "node:child_process";
import { unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { SUPERSET_DIR_NAME } from "shared/constants";
import { treeKillAsync } from "../../tree-kill";
import type {
	CliShimResult,
	DefaultShellSpec,
	IpcEndpoint,
	IpcEndpointName,
	KillTreeResult,
	PlatformAdapter,
	TreeKillSignal,
} from "../types";

const SUPERSET_HOME_DIR = join(homedir(), SUPERSET_DIR_NAME);

function endpointPath(name: IpcEndpointName): string {
	return join(SUPERSET_HOME_DIR, `${name}.sock`);
}

export const darwinAdapter: PlatformAdapter = {
	id: "darwin",

	// IPC ----------------------------------------------------------------
	ipcEndpoint(name) {
		return { kind: "unix", path: endpointPath(name) };
	},

	listenOptions(endpoint) {
		return { path: endpoint.path };
	},

	connectOptions(endpoint) {
		return { path: endpoint.path };
	},

	async cleanupEndpoint(endpoint) {
		try {
			await unlink(endpoint.path);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
		}
	},

	// Shell --------------------------------------------------------------
	defaultShell(): DefaultShellSpec {
		const command = process.env.SHELL || "/bin/zsh";
		return {
			command,
			args: ["-l"],
			envOverrides: {},
		};
	},

	async resolveExecutable(name) {
		return resolveOnPath(name, /* pathext */ null);
	},

	// Process ------------------------------------------------------------
	async killTree(pid, signal): Promise<KillTreeResult> {
		const sig = signal === "kill" ? "SIGKILL" : "SIGTERM";
		try {
			await treeKillAsync(pid, sig);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	},

	processExists(pid) {
		if (!Number.isInteger(pid) || pid <= 0) return false;
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	},

	// System -------------------------------------------------------------
	playSound(soundPath, volume, callbacks): ChildProcess | null {
		const volumeDecimal = volume / 100;
		return execFile(
			"afplay",
			["-v", volumeDecimal.toString(), soundPath],
			() => callbacks?.onComplete?.(),
		);
	},

	async appleEventsPermission() {
		// Real implementation lives in apps/desktop/src/main/lib/apple-events-permission.ts.
		// In M5 that call site is rerouted through here; for M1 we just expose the
		// capability so callers can detect mac-only behavior without sniffing
		// `process.platform` themselves.
		return "unsupported";
	},

	// CLI shim -----------------------------------------------------------
	async generateCliShim({ name, shimDir, targetBinary }): Promise<CliShimResult> {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const shimPath = path.join(shimDir, name);
		const quoted = targetBinary.replace(/'/g, `'"'"'`);
		const script = `#!/bin/sh\nexec '${quoted}' "$@"\n`;
		await fs.mkdir(shimDir, { recursive: true });
		await fs.writeFile(shimPath, script, { mode: 0o755 });
		return { primaryPath: shimPath, writtenPaths: [shimPath] };
	},
};

// ----------------------------------------------------------------------------
// Shared helper: resolveOnPath
//
// Both darwin and linux can share a plain `PATH` walk. The win32 adapter has
// its own version that consults `PATHEXT`.
// ----------------------------------------------------------------------------
async function resolveOnPath(
	name: string,
	pathext: string[] | null,
): Promise<string | null> {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");
	const PATH = process.env.PATH ?? "";
	const sep = process.platform === "win32" ? ";" : ":";
	const dirs = PATH.split(sep).filter(Boolean);
	const candidates = pathext ? [name, ...pathext.map((ext) => name + ext)] : [name];
	for (const dir of dirs) {
		for (const candidate of candidates) {
			const full = path.join(dir, candidate);
			try {
				await fs.access(full, /* X_OK */ 1);
				return full;
			} catch {
				/* not here; keep looking */
			}
		}
	}
	return null;
}

export const __testing = { resolveOnPath };
