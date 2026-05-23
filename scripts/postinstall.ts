#!/usr/bin/env bun
/**
 * Cross-platform postinstall script.
 *
 * Replaces the legacy bash `scripts/postinstall.sh` so that `bun install` works
 * on Windows (where Bun cannot execute `.sh` files without a POSIX shell on
 * PATH). Behaviour is intentionally identical to the bash version:
 *
 *   1. Bail out if `SUPERSET_POSTINSTALL_RUNNING` is already set (recursion
 *      guard — `electron-builder install-app-deps` triggers nested
 *      `bun install` calls which would otherwise spawn hundreds of processes).
 *   2. Run `sherif` for workspace validation.
 *   3. In CI, stop here — desktop native rebuilds are not needed for most jobs
 *      and are flaky while the parent install is still materializing packages.
 *   4. Otherwise run the desktop app's `install:deps` (electron-builder
 *      install-app-deps) so node-pty / better-sqlite3 / etc. get rebuilt
 *      against the local Electron ABI.
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

if (process.env.SUPERSET_POSTINSTALL_RUNNING) {
	process.exit(0);
}
process.env.SUPERSET_POSTINSTALL_RUNNING = "1";

const isWindows = process.platform === "win32";

function run(command: string, args: string[]): number {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		// `shell: true` lets Windows resolve `.cmd` / `.ps1` shims for tools
		// installed via Bun (e.g. `sherif`).
		shell: isWindows,
		env: process.env,
	});
	if (result.error) {
		console.error(`[postinstall] failed to spawn ${command}:`, result.error);
		return 1;
	}
	return result.status ?? 1;
}

// 1. Workspace validation.
const sherifStatus = run("sherif", []);
if (sherifStatus !== 0) {
	process.exit(sherifStatus);
}

// 2. Skip native rebuilds in CI.
if (process.env.CI) {
	process.exit(0);
}

// 3. Rebuild desktop native dependencies.
//
// Native rebuilds on Windows can fail when the local MSVC toolchain is
// missing components (e.g. Spectre-mitigated libraries). Rather than
// blocking `bun install` for every contributor without that VS component,
// we treat `install:deps` failures as non-fatal here and emit a clear
// warning. Modules that fail to rebuild will surface a clear `require()`
// error at launch and can be fixed by re-running `bun run install:deps`
// once the toolchain is available.
//
// Set `SUPERSET_STRICT_NATIVE_REBUILD=1` to restore the old fail-fast behaviour
// (used in release pipelines).
const installDepsStatus = run("bun", ["run", "install:deps"]);
if (installDepsStatus !== 0) {
	if (process.env.SUPERSET_STRICT_NATIVE_REBUILD) {
		process.exit(installDepsStatus);
	}
	console.warn(
		"\n[postinstall] WARNING: `install:deps` exited with code " +
			`${installDepsStatus}. One or more native modules failed to rebuild ` +
			"against the local Electron ABI. The install will continue, but " +
			"affected modules may not work until rebuilt manually.\n" +
			"  - On Windows, this is most commonly the MSVC Spectre-mitigated " +
			"libraries (Visual Studio Installer > Individual components).\n" +
			"  - Re-run `bun run install:deps` after fixing the toolchain.\n" +
			"  - Set SUPERSET_STRICT_NATIVE_REBUILD=1 to make this fatal.\n",
	);
}
process.exit(0);
