# Windows-Specific Changes

This document tracks all modifications made to the upstream [superset-sh/superset](https://github.com/superset-sh/superset) codebase for Windows compatibility.

## Summary

| Area | Change | Status |
|------|--------|--------|
| File paths | Normalize backslash vs. forward slash handling | 🚧 In Progress |
| Terminal | Replace macOS pty with Windows ConPTY | 🚧 In Progress |
| Keyboard shortcuts | ⌘ → Ctrl, ⌥ → Alt | 🚧 In Progress |
| Build tooling | Electron-builder targets `nsis` / `msi` | 🚧 In Progress |
| Caddy setup | Adapt for Windows installation paths | 🚧 In Progress |

## Detailed Changes

### 2026-05-22 — Initial snapshot import from local `superset` HEAD `0aedec34d`

Imported full working tree from the local upstream fork (commit `0aedec34d` — "refactor: strip cloud/auth, make app local-only"). The snapshot already contains the following Windows work:

| Area | Path(s) | What changed |
|------|---------|--------------|
| Platform abstraction | `apps/desktop/src/main/lib/platform/{darwin,linux,win32}Adapter/` | `PlatformAdapter` interface + per-OS implementations + singleton selector with `setPlatformForTesting` helper. |
| Windows CI | `.github/workflows/build-desktop-windows.yml` | Soft-fail Windows build workflow. |
| Audit doc | `apps/desktop/docs/WINDOWS_AUDIT.md` | Tracks remaining macOS-only API call sites. |
| Cross-platform build | `scripts/postinstall.ts`, `apps/desktop/runtime-dependencies.ts`, `apps/desktop/scripts/copy-native-modules.ts`, `apps/desktop/electron-builder.ts`, `packages/macos-process-metrics/package.json` | `postinstall.sh` → `postinstall.ts`; macOS-only native deps gated by `os: darwin` + `optionalDependencies`; `npmRebuild: false`; recursive `rmSync` to avoid Bun-on-Windows EFAULT on dir symlinks. |
| Named-pipe IPC (M2) | `apps/desktop/src/main/lib/terminal-host/client.ts`, `apps/desktop/src/main/terminal-host/index.ts`, `packages/host-service/src/daemon/DaemonSupervisor.ts`, `packages/pty-daemon/src/Server/Server.ts` | On `win32`, listen on `\\.\pipe\superset-*` instead of UDS files (UDS files trigger EACCES on Windows); skip `mkdirSync`/`unlinkSync`/`chmodSync` for pipes. |
| Cloud/auth removal | repo-wide | Stripped non-local apps (`apps/web`, auth flows, etc.) so the desktop app runs fully local. |
| Project rename | `package.json` (this commit) | `@superset/desktop` → `superwin`, `productName` → `SuperWin`. |
| Workflow cleanup | `.github/workflows/build-desktop.yml` (this commit) | Removed macOS-only build workflow. |

Verified upstream: `bun run package --win --x64 --dir` produces `release/win-unpacked/Superset.exe` that launches on Windows with main window, local DB migrations, and renderer load.
