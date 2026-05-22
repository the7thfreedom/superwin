/**
 * Platform abstraction layer — types
 *
 * Single seam that hides macOS / Linux / Windows differences from the rest of
 * the main process. See plans/20260519-1430-windows-platform-support.md
 * (Milestone 1) for context.
 *
 * Design principles:
 * 1. Operations are async by default so a future remote/sandboxed adapter
 *    can fit the same shape.
 * 2. No call site should ever read `process.platform` again — always go
 *    through `platform.id` or one of the typed adapter methods.
 * 3. New capabilities are added as optional methods. Callers narrow with
 *    explicit checks (`if (platform.appleEventsPermission)`), not
 *    `instanceof`.
 */

import type { ChildProcess } from "node:child_process";
import type { ListenOptions, NetConnectOpts } from "node:net";

/** Stable identifier for the host platform. */
export type PlatformId = "darwin" | "linux" | "win32";

/**
 * Logical IPC endpoint name. The adapter maps this to a Unix domain socket
 * path on POSIX or a Named Pipe name on Windows.
 *
 * Use short, lowercase, hyphenated names. Do NOT include the `.sock` suffix
 * or the `\\.\pipe\` prefix — the adapter adds those.
 */
export type IpcEndpointName = string;

/**
 * Resolved IPC endpoint, ready to hand to Node's `net` module.
 *
 * - POSIX: `{ kind: "unix", path: "/Users/x/.superset/terminal-host.sock" }`
 * - Win32: `{ kind: "pipe", path: "\\\\.\\pipe\\superset-terminal-host" }`
 *
 * The `listen` and `connect` helpers below already wrap this in the shape
 * Node expects, so callers should normally not need to read `path` directly.
 */
export interface IpcEndpoint {
	readonly kind: "unix" | "pipe";
	readonly path: string;
}

/**
 * Description of the platform's default user shell, in a shape ready to pass
 * to `node-pty.spawn(command, args, { env })`.
 */
export interface DefaultShellSpec {
	command: string;
	args: string[];
	/**
	 * Env overrides to merge on top of `process.env` when launching the
	 * shell. For example, on Windows we may want to unset `SHELL` (which some
	 * cross-platform tools misinterpret as a hint to use POSIX semantics).
	 */
	envOverrides: Record<string, string | undefined>;
}

/**
 * Normalized signal name for `killTree`. POSIX adapters map to `SIGTERM` /
 * `SIGKILL`; the win32 adapter ignores the value and always uses
 * `taskkill /F` for `kill` and a graceful WM_CLOSE attempt for `terminate`.
 */
export type TreeKillSignal = "terminate" | "kill";

export interface KillTreeResult {
	success: boolean;
	error?: string;
}

/**
 * Optional shape produced by `generateCliShim`: a description of the files
 * the adapter wrote into `shimDir`.
 */
export interface CliShimResult {
	/** Primary entry the user is expected to invoke (e.g. `super` or `super.cmd`). */
	primaryPath: string;
	/** All files that were written (so callers can chmod / sign / ignore them). */
	writtenPaths: string[];
}

/**
 * The platform abstraction. Implementations live alongside this file in
 * `darwinAdapter/`, `linuxAdapter/`, and `win32Adapter/`. The singleton is
 * exported from `./platform.ts`.
 */
export interface PlatformAdapter {
	readonly id: PlatformId;

	// ---------------------------------------------------------------------
	// IPC (Milestone 2)
	// ---------------------------------------------------------------------

	/**
	 * Resolve a logical endpoint name to a concrete path.
	 *
	 * @example
	 * platform.ipcEndpoint("terminal-host")
	 * // darwin/linux: { kind: "unix", path: "~/.superset/terminal-host.sock" }
	 * // win32:        { kind: "pipe", path: "\\\\.\\pipe\\superset-terminal-host" }
	 */
	ipcEndpoint(name: IpcEndpointName): IpcEndpoint;

	/**
	 * Build the options object for `net.createServer().listen(...)` so that
	 * the same call site works on both POSIX and Windows.
	 */
	listenOptions(endpoint: IpcEndpoint): ListenOptions;

	/**
	 * Build the options object for `net.connect(...)`.
	 */
	connectOptions(endpoint: IpcEndpoint): NetConnectOpts;

	/**
	 * Remove any stale endpoint file from disk. No-op on Windows (pipes have
	 * no filesystem entry to clean up).
	 */
	cleanupEndpoint(endpoint: IpcEndpoint): Promise<void>;

	// ---------------------------------------------------------------------
	// Shell & PTY (Milestone 3)
	// ---------------------------------------------------------------------

	/**
	 * Return the user's preferred login shell + sensible arguments.
	 *
	 * Implementations:
	 *   darwin: `process.env.SHELL ?? "/bin/zsh"` (interactive `-l`)
	 *   linux:  `process.env.SHELL ?? "/bin/bash"` (interactive `-l`)
	 *   win32:  pwsh.exe → powershell.exe → cmd.exe (first one found)
	 */
	defaultShell(): DefaultShellSpec;

	/**
	 * Resolve an executable name on `PATH`, honoring platform-specific
	 * extension lookup (`PATHEXT` on Windows). Returns `null` when not
	 * found. Result is cached for the lifetime of the process.
	 */
	resolveExecutable(name: string): Promise<string | null>;

	// ---------------------------------------------------------------------
	// Process control (Milestone 4)
	// ---------------------------------------------------------------------

	/**
	 * Kill a process AND every descendant it spawned. The adapter chooses
	 * the right mechanism (`process.kill(-pgid)` on POSIX, `taskkill /T`
	 * on Windows). Always returns; never throws.
	 */
	killTree(pid: number, signal: TreeKillSignal): Promise<KillTreeResult>;

	/**
	 * Best-effort check whether a PID is still alive. Returns `false` for
	 * invalid PIDs.
	 */
	processExists(pid: number): boolean;

	/**
	 * Optional: on Windows, attach the child to a Job Object so that it is
	 * automatically killed when the Electron main process exits even on
	 * unclean shutdown. No-op elsewhere.
	 */
	attachToJobObject?(child: ChildProcess): void;

	// ---------------------------------------------------------------------
	// System integrations (Milestone 5)
	// ---------------------------------------------------------------------

	/**
	 * Play a sound file at the given volume (0-100). Returns the spawned
	 * child process (so callers can cancel it), or `null` if the platform
	 * cannot play sounds in this context.
	 */
	playSound(
		soundPath: string,
		volume: number,
		callbacks?: {
			onComplete?: () => void;
			isCanceled?: () => boolean;
			onProcessChange?: (process: ChildProcess) => void;
		},
	): ChildProcess | null;

	/**
	 * Optional: probe whether the macOS "Automation" permission has been
	 * granted. Only meaningful on darwin; absent on other platforms (so
	 * callers must check `if (platform.appleEventsPermission)` before
	 * calling).
	 */
	appleEventsPermission?(): Promise<"granted" | "denied" | "unsupported">;

	// ---------------------------------------------------------------------
	// CLI shim (Milestone 6)
	// ---------------------------------------------------------------------

	/**
	 * Write a shim that forwards to the given target binary into `shimDir`.
	 *
	 *   POSIX: `${shimDir}/${name}` with `#!/bin/sh\nexec '<target>' "$@"`
	 *   Win32: `${shimDir}/${name}.cmd` with `@"<target>" %*`
	 */
	generateCliShim(args: {
		name: string;
		shimDir: string;
		targetBinary: string;
	}): Promise<CliShimResult>;
}
