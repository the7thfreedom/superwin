/**
 * Linux implementation of `PlatformAdapter`.
 *
 * Mirrors the darwin adapter where behavior is identical (UDS, POSIX signals,
 * `PATH` walk) and uses Linux-native tools where it differs (`paplay`/`aplay`
 * for audio, `xdg-open` not yet used here but reserved for M6).
 *
 * This adapter is shipped in Milestone 1 to enforce the abstraction at the
 * type level. End-to-end Linux validation is out of scope for the Windows
 * support plan — a follow-up plan tracks Linux GA.
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
	IpcEndpointName,
	KillTreeResult,
	PlatformAdapter,
} from "../types";

const SUPERSET_HOME_DIR = join(homedir(), SUPERSET_DIR_NAME);

function endpointPath(name: IpcEndpointName): string {
	return join(SUPERSET_HOME_DIR, `${name}.sock`);
}

export const linuxAdapter: PlatformAdapter = {
	id: "linux",

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

	defaultShell(): DefaultShellSpec {
		const command = process.env.SHELL || "/bin/bash";
		return {
			command,
			args: ["-l"],
			envOverrides: {},
		};
	},

	async resolveExecutable(name) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const dirs = (process.env.PATH ?? "").split(":").filter(Boolean);
		for (const dir of dirs) {
			const full = path.join(dir, name);
			try {
				await fs.access(full, /* X_OK */ 1);
				return full;
			} catch {
				/* keep looking */
			}
		}
		return null;
	},

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

	playSound(soundPath, volume, callbacks): ChildProcess | null {
		const volumeDecimal = volume / 100;
		const paVolume = Math.round(volumeDecimal * 65536);
		return execFile(
			"paplay",
			["--volume", paVolume.toString(), soundPath],
			(error) => {
				if (error) {
					if (callbacks?.isCanceled?.()) {
						callbacks?.onComplete?.();
						return;
					}
					if (volume === 0) {
						callbacks?.onComplete?.();
						return;
					}
					const fallback = execFile("aplay", [soundPath], () =>
						callbacks?.onComplete?.(),
					);
					callbacks?.onProcessChange?.(fallback);
					return;
				}
				callbacks?.onComplete?.();
			},
		);
	},

	async generateCliShim({
		name,
		shimDir,
		targetBinary,
	}): Promise<CliShimResult> {
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
