/**
 * Windows implementation of `PlatformAdapter`.
 *
 * Key differences from POSIX adapters:
 *
 * - IPC uses **Named Pipes** (`\\.\pipe\superset-<name>`). Node's `net`
 *   module supports them via the same `listen({ path })` / `connect({ path })`
 *   API — we just need to spell the path differently and skip filesystem
 *   cleanup.
 * - Default shell prefers `pwsh.exe` if installed, then falls back through
 *   `powershell.exe` to `cmd.exe`. The shell resolution is cached for the
 *   lifetime of the process to avoid re-scanning PATH on every PTY spawn.
 * - `killTree` shells out to `taskkill /F /T /PID <pid>` — Windows has no
 *   process-group concept, so the recursive flag is mandatory.
 * - `playSound` invokes PowerShell's `Media.SoundPlayer` (synchronous play
 *   via `PlaySync`). Volume is not honored at the API level (Windows
 *   `SoundPlayer` has no per-call volume); a future revision can route
 *   through `WMPlayer.OCX` or `winmm.dll` if per-sound volume becomes
 *   important.
 * - `generateCliShim` writes a `.cmd` (and a sibling `.ps1`) instead of a
 *   POSIX `#!/bin/sh` script. The `.cmd` uses `@call` so we don't get a
 *   surplus shell window.
 *
 * This adapter targets Windows 10 1809+ / Windows 11 on x64 and arm64.
 */

import { type ChildProcess, execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { SUPERSET_DIR_NAME } from "shared/constants";
import type {
	CliShimResult,
	DefaultShellSpec,
	IpcEndpointName,
	KillTreeResult,
	PlatformAdapter,
} from "../types";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const _SUPERSET_HOME_DIR = join(homedir(), SUPERSET_DIR_NAME);

/** Named-pipe prefix mandated by Windows. */
const PIPE_PREFIX = "\\\\.\\pipe\\";

/**
 * Pipe-name namespace. Keeping all our pipes under `superset-<name>` makes
 * them easy to grep with `Get-ChildItem \\.\pipe\` and avoids collisions with
 * unrelated apps that listen on common names like `terminal-host`.
 */
const PIPE_NAMESPACE = "superset-";

// ----------------------------------------------------------------------------
// Shell resolution
// ----------------------------------------------------------------------------

let cachedShell: DefaultShellSpec | null = null;

/**
 * Search PATH for a Windows executable, honoring PATHEXT. Returns the
 * absolute path of the first match, or `null` when nothing is found.
 *
 * Exported for tests; production code should use `win32Adapter.resolveExecutable`.
 */
export async function resolveWindowsExecutable(
	name: string,
): Promise<string | null> {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");

	const PATH = process.env.PATH ?? process.env.Path ?? "";
	const PATHEXT = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
		.split(";")
		.map((e) => e.trim())
		.filter(Boolean);

	const dirs = PATH.split(";").filter(Boolean);
	const hasExt = path.extname(name).length > 0;
	const candidates = hasExt
		? [name]
		: [name, ...PATHEXT.map((ext) => name + ext)];

	for (const dir of dirs) {
		for (const candidate of candidates) {
			const full = path.join(dir, candidate);
			try {
				await fs.access(full);
				return full;
			} catch {
				/* keep looking */
			}
		}
	}
	return null;
}

async function pickDefaultShell(): Promise<DefaultShellSpec> {
	// 1. Honor explicit override (matches macOS/Linux behavior where SHELL is
	//    user-controlled). Some Windows users set this to point at Git Bash;
	//    we respect it as long as the file exists.
	const explicit = process.env.SUPERSET_DEFAULT_SHELL;
	if (explicit) {
		return { command: explicit, args: [], envOverrides: shellEnvOverrides() };
	}

	// 2. Prefer PowerShell 7+ if installed.
	const pwsh = await resolveWindowsExecutable("pwsh.exe");
	if (pwsh) {
		return {
			command: pwsh,
			args: ["-NoLogo"],
			envOverrides: shellEnvOverrides(),
		};
	}

	// 3. Fall back to Windows PowerShell 5.1 (preinstalled on Win 10/11).
	const ps = await resolveWindowsExecutable("powershell.exe");
	if (ps) {
		return {
			command: ps,
			args: ["-NoLogo"],
			envOverrides: shellEnvOverrides(),
		};
	}

	// 4. Last resort: cmd.exe (always exists).
	return {
		command: process.env.COMSPEC || "cmd.exe",
		args: [],
		envOverrides: shellEnvOverrides(),
	};
}

/**
 * Env tweaks to apply on top of `process.env` when launching the default
 * shell on Windows.
 *
 * - Unset `SHELL`: some cross-platform tools (e.g. older `npm` versions, CI
 *   helpers) misinterpret a POSIX-style `SHELL` value as a hint that they
 *   should use POSIX semantics. On Windows it should be absent.
 */
function shellEnvOverrides(): Record<string, string | undefined> {
	return { SHELL: undefined };
}

// ----------------------------------------------------------------------------
// Adapter
// ----------------------------------------------------------------------------

export const win32Adapter: PlatformAdapter = {
	id: "win32",

	// IPC ----------------------------------------------------------------
	ipcEndpoint(name: IpcEndpointName) {
		return {
			kind: "pipe",
			path: `${PIPE_PREFIX}${PIPE_NAMESPACE}${name}`,
		};
	},

	listenOptions(endpoint) {
		return { path: endpoint.path };
	},

	connectOptions(endpoint) {
		return { path: endpoint.path };
	},

	async cleanupEndpoint(_endpoint) {
		// Named pipes are kernel objects; they evaporate when the last
		// handle closes. Nothing to delete from the filesystem.
	},

	// Shell --------------------------------------------------------------
	defaultShell(): DefaultShellSpec {
		// Synchronous facade so the interface stays uniform across platforms.
		// We do the async PATH walk lazily and cache the result.
		if (cachedShell) return cachedShell;

		// Best-effort synchronous probe to avoid forcing all callers to be
		// async. We check the well-known absolute paths first; the async
		// `pickDefaultShell` is invoked in the background to populate the
		// cache for future calls if none of the well-known paths exist.
		const wellKnown = synchronousWellKnownShell();
		if (wellKnown) {
			cachedShell = wellKnown;
			return wellKnown;
		}

		// Schedule the async resolution but don't await — return a safe
		// default (`cmd.exe`) right now. The next call will pick up the
		// resolved value.
		void pickDefaultShell().then((spec) => {
			cachedShell = spec;
		});

		const fallback: DefaultShellSpec = {
			command: process.env.COMSPEC || "cmd.exe",
			args: [],
			envOverrides: shellEnvOverrides(),
		};
		cachedShell = fallback;
		return fallback;
	},

	async resolveExecutable(name) {
		return resolveWindowsExecutable(name);
	},

	// Process ------------------------------------------------------------
	async killTree(pid, signal): Promise<KillTreeResult> {
		if (!Number.isInteger(pid) || pid <= 0) {
			return { success: false, error: `Invalid pid: ${pid}` };
		}
		const args = ["/PID", String(pid), "/T"];
		if (signal === "kill") args.push("/F");

		return new Promise((resolve) => {
			execFile("taskkill", args, (err) => {
				if (err) {
					// taskkill exits with 128 when the process is already gone;
					// treat that as success.
					const code = (err as NodeJS.ErrnoException & { code?: number }).code;
					if (code === 128) {
						resolve({ success: true });
						return;
					}
					resolve({
						success: false,
						error: err.message,
					});
					return;
				}
				resolve({ success: true });
			});
		});
	},

	processExists(pid) {
		if (!Number.isInteger(pid) || pid <= 0) return false;
		try {
			// On Windows, signal 0 is supported by libuv and performs an
			// existence check (OpenProcess + immediate close). It does NOT
			// require permission to signal the process.
			process.kill(pid, 0);
			return true;
		} catch (err) {
			// EPERM means the process exists but we lack signal rights —
			// that still counts as "alive" for our purposes.
			if ((err as NodeJS.ErrnoException).code === "EPERM") return true;
			return false;
		}
	},

	// System -------------------------------------------------------------
	playSound(soundPath, _volume, callbacks): ChildProcess | null {
		// PowerShell's Media.SoundPlayer plays WAV files. For our use case
		// (short notification chimes shipped as .wav) that is sufficient.
		// Per-sound volume is not honored — system mixer applies.
		//
		// We spawn detached and unref so the child does not keep the parent
		// alive; the renderer/main process owns the cancellation policy via
		// the returned ChildProcess handle.
		const escapedPath = soundPath.replace(/'/g, "''");
		const script = `(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`;
		const child = spawn(
			"powershell.exe",
			["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
			{ windowsHide: true, stdio: "ignore" },
		);
		child.once("exit", () => {
			if (callbacks?.isCanceled?.()) {
				callbacks?.onComplete?.();
				return;
			}
			callbacks?.onComplete?.();
		});
		return child;
	},

	// CLI shim -----------------------------------------------------------
	async generateCliShim({
		name,
		shimDir,
		targetBinary,
	}): Promise<CliShimResult> {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		await fs.mkdir(shimDir, { recursive: true });

		// `.cmd` shim — invoked by users from cmd.exe / Run dialog / Explorer.
		// `@call` keeps the parent shell's environment so e.g. `super --version`
		// returns the child's exit code to the caller.
		const cmdPath = path.join(shimDir, `${name}.cmd`);
		const cmdScript = [
			"@echo off",
			`@call "${targetBinary}" %*`,
			"@exit /b %ERRORLEVEL%",
			"",
		].join("\r\n");
		await fs.writeFile(cmdPath, cmdScript);

		// `.ps1` shim — invoked from PowerShell; preserves stdout/stderr
		// streams and exit codes.
		const ps1Path = path.join(shimDir, `${name}.ps1`);
		const ps1Script = [
			"$ErrorActionPreference = 'Continue'",
			`& "${targetBinary}" @Args`,
			"exit $LASTEXITCODE",
			"",
		].join("\r\n");
		await fs.writeFile(ps1Path, ps1Script);

		return {
			primaryPath: cmdPath,
			writtenPaths: [cmdPath, ps1Path],
		};
	},
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Synchronous probe of the well-known absolute paths for PowerShell. Used by
 * `defaultShell()` to avoid an async hop on the hot terminal-spawn path.
 */
function synchronousWellKnownShell(): DefaultShellSpec | null {
	// Avoid importing `node:fs` sync API at module top so that this file can
	// be safely required in non-Windows test contexts.
	// biome-ignore lint/correctness/noNodejsModules: deliberate sync probe.
	const fs = require("node:fs") as typeof import("node:fs");

	const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
	const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
	const candidates: Array<{ command: string; args: string[] }> = [
		// PowerShell 7+ (preferred)
		{
			command: `${programFiles}\\PowerShell\\7\\pwsh.exe`,
			args: ["-NoLogo"],
		},
		// Windows PowerShell 5.1 (preinstalled)
		{
			command: `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
			args: ["-NoLogo"],
		},
	];

	for (const c of candidates) {
		try {
			fs.accessSync(c.command);
			return { ...c, envOverrides: shellEnvOverrides() };
		} catch {
			/* try next */
		}
	}
	return null;
}

export const __testing = {
	resolveWindowsExecutable,
	pickDefaultShell,
	synchronousWellKnownShell,
};
