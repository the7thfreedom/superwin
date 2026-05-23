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


### 2026-05-23 — Post-import hardening

| Area | Path(s) | What changed |
|------|---------|--------------|
| Native rebuild | `scripts/postinstall.ts`, `runtime-dependencies.ts` | Made `install:deps` failures non-fatal during `bun install` (warning + `SUPERSET_STRICT_NATIVE_REBUILD=1` opt-in for fail-fast); removed dead `@mastra/duckdb` entry left over from cloud-strip. |
| Bash → TypeScript | `scripts/lint.ts`, `scripts/check-desktop-git-env.ts`, `scripts/check-git-ref-strings.ts`, `scripts/check-simple-git-usage.ts`, `scripts/lint-helpers.ts` | Ported four bash check scripts plus the lint wrapper to Bun/TS so the Windows port has no POSIX-shell or ripgrep runtime dependency. `scripts/postinstall.sh` deleted (already superseded by `scripts/postinstall.ts`). |
| Lint auto-fix | repo-wide | Ran `bun run lint:fix` (biome `check --write --unsafe`): 3089 files fixed, 0 errors, 59 warnings (mostly `noExplicitAny` in cloud-strip stub modules — address separately). |
| Flat node_modules | `scripts/copy-native-modules.ts` | `getWorkspaceRootNodeModulesDir` assumed the upstream monorepo layout (`apps/desktop/node_modules → ../../../node_modules`), which escapes the SuperWin repo entirely (`Q:\node_modules`) and broke transitive support-module resolution (`is-glob` not found). Now detects the flat layout via `.bun` sibling and returns the same directory. |
| Cloud-strip dead refs | `src/renderer/stores/new-workspace-prompt-context/fetchers.ts` | `fetchPrBody` no longer calls `trpc.pullRequests.getContent.query` — that router was removed by the upstream cloud-strip. Returns `null` so callers fall through to their no-context path. |

**Known open work** (not addressed in this session):

- `bun run typecheck` reports ~597 errors after the post-import work above. Distribution: `TS2339` × 405 (mostly `Ref<WithVirtualProps>` losing inferred properties — likely stale generated types from the cloud-strip), `TS7006` × 78 (implicit any), `TS18046` × 43 (`unknown`), `TS2322` × 40 (incl. ~10 TanStack Router path literals like `/new-project` / `/tasks` / `/settings/account` whose route files were removed by the cloud-strip). Needs a dedicated cleanup pass.
- Native modules requiring MSVC Spectre-mitigated libraries (`node-pty` rebuild) still fail without that VS component installed. Postinstall now emits a warning instead of blocking install; runtime `require()` will surface the failure if the module is actually loaded.
