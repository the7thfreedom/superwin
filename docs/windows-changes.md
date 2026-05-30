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


### 2026-05-24 — Typecheck cleanup pass

| Area | Path(s) | What changed |
|------|---------|--------------|
| Collection row types | `src/renderer/routes/_authenticated/providers/CollectionsProvider/index.ts` | The cloud-strip replaced the collections provider with `any`-typed stub collections. When `any`/`object`-typed rows flow through TanStack DB's `q.from().select()` query builder, the ref-proxy resolves to `Ref<WithVirtualProps<object>>` with no named properties, so every `.id`/`.title`/`.tabOrder`/etc. access failed with `TS2339`. Typed the stub rows with an **index-signature row** (`Record<string, any>`) so `keyof` includes `string \| number` and arbitrary field access resolves to `unknown` instead of erroring, and propagated the typed `Collection<CollectionRow>` through `makeCollection`/`buildCollections`/`useCollections` (previously erased to `any`). Eliminated ~393 errors. |
| Chat service router | `packages/chat/src/server/desktop/index.ts` | Reconstructed `ChatServiceRouter` as a permissive tRPC router (`auth`/`workspace` sub-routers, loose `z.any()` inputs and `Record<string, any>` outputs, typed slash-command list). The renderer's `createTRPCReact<ChatServiceRouter>()` was resolving to the "router collides with built-in method" error union because the type was `any`. |
| Host-service routers | `packages/host-service/src/trpc/router/stub-routers.ts`, `router.ts` | Added stub `auth` / `chat` / `pullRequests` sub-routers to the host-service `appRouter`. These were cloud-stripped but the renderer (`workspaceTrpc` and the per-host vanilla clients) still calls them (`chat.sendMessage`, `pullRequests.getByWorkspaces`, etc.). Loose inputs/outputs, with PR/slash-command shapes typed where consumers destructure. |

Net result: `bun run typecheck` errors reduced **597 → 159** (-73%).

**Remaining open work** (~159 errors, genuine cloud-strip feature debt):

- **`TS2322` dead routes (~30)** — components still `<Link to="…">` / `navigate({ to })` to routes the cloud-strip removed (`/tasks`, `/tasks/$taskId`, `/automations`, `/new-project`, `/settings/account`, `/welcome`, `/setup/providers`). Fixing requires either re-adding stub route files (and regenerating `routeTree.gen.ts`) or removing the dead navigation — a product decision, not a mechanical fix.
- **`Promise<string \| null>` vs `string` (~6)** — an auth-token getter became async; sync consumers need awaiting. Needs per-call-site review.
- **`TS7006` / `TS18046` long tail (~45)** — implicit-`any` / `unknown` callback params (chat message `part`/`message`, immer `draft`, etc.) that are symptoms of upstream `any` from stripped message/snapshot types.
- **Misc `TS2353` / `TS2345` / `TS2614` / `TS2739` (~40)** — in v2 workspace components (`V2PresetsSection`, `V2SessionsSection`, `ModelsSettings`, etc.), mostly downstream of the loose stub-router/collection shapes.


### 2026-05-30 — Terminal daemon (ConPTY) startup fix

| Area | Path(s) | What changed |
|------|---------|--------------|
| PTY daemon socket gate | `src/main/lib/terminal-host/client.ts` | The Windows port had a broken helper `const socketPathExists = () => IS_PIPE \|\| socketPathExists();` — it **calls itself** (infinite recursion on non-Windows; on Windows short-circuits to always-`true`). Because the same helper was used both for "don't bail before trying `connect()`" gates **and** for the startup "is a stale daemon present?" probe, the always-`true` value made `tryConnectAndAuthenticate()` throw `Existing terminal daemon probe failed while a socket path was present` on **every** launch (logged as `[DaemonTerminalManager] Failed to reconcile sessions`). Split into two correctly-scoped helpers: `socketArtifactExists()` (raw on-disk check; always false for a Windows named pipe — used by the probe so a failed connect is correctly read as "no daemon", since the OS removes the pipe when the server exits) and `daemonEndpointMaybeReachable()` (`IS_PIPE \|\| socketArtifactExists()` — used by connection/lifecycle gates so they proceed to `connect()` and still early-return when a daemon is already live). Verified: app now starts with no daemon-reconcile error. |

| Native rebuild | `node-pty` (rebuilt against Electron 40 / MSVC Spectre libs) | With the MSVC Spectre-mitigated libraries now installed, rebuilt `node-pty` via `bunx electron-rebuild --only node-pty`. Note: `bun run install:deps` (full `electron-builder install-app-deps`) currently **fails on `native-keymap@3.3.9`** — it uses the deprecated `v8::Object::GetAlignedPointerFromInternalField` overload, which Electron 40 headers escalate to error `C4996`. `native-keymap` was deliberately removed in the original port (commit `3f14acd`) for this reason; it is re-added in pending WIP. Until that module is updated or removed again, rebuild native deps scoped to the modules that actually compile, or drop `native-keymap`. |


### 2026-05-30 — Tailwind `@source` paths broken by desktop-app flattening

| Area | Path(s) | What changed |
|------|---------|--------------|
| Tailwind content scan | `src/renderer/globals.css` | The port flattened the desktop app from upstream's `apps/desktop/src/renderer/` to the repo-root `src/renderer/`, but the Tailwind v4 `@source` globs still climbed **four** levels up (`../../../../packages/ui/...`), which from `src/renderer/` resolves to `Q:\packages\ui\...` — outside the repo. As a result Tailwind **never scanned `packages/ui/src`**, so any utility class used *only* in the UI package produced no generated CSS. The visible symptom: `PromptInputTextarea` / base `Textarea` set `field-sizing-content`, but the rule was never emitted, so the prompt textarea computed `field-sizing: fixed` and was stuck at a fixed 2-row height (72px) instead of auto-sizing — making the New Workspace modal's input area look collapsed. Most styling still worked because those classes also appear in renderer files (covered by `./**`). Fixed by correcting the two over-deep globs to `../../packages/ui/src/**/*.{ts,tsx}` and `../../packages/ui/node_modules/streamdown/dist/*.js`. |
| Terminal launch newline | `src/renderer/lib/terminal/launch-command.ts` | `normalizeTerminalCommand` appended `\n` (LF) to auto-launch commands (clicking a coding-agent shortcut, or submitting the New Workspace form). A terminal **Enter** keypress is a carriage return (`\r`) — that is what xterm.js sends. On Unix the tty line discipline (`ICRNL`) maps a bare `\n` to a line submit, so `\n` happens to work; **Windows ConPTY has no line discipline**, so a bare `\n` is inserted literally and the command **never executes** — it sits at the prompt waiting for the user to press Enter (e.g. `claude --permission-mode acceptEdits` typed but not run). Now selects the submit char by platform via the renderer `PLATFORM` constant: `\r` on Windows, `\n` elsewhere (also early-returns if the command already ends in `\r`/`\n`). `launch-command.test.ts` updated to derive the expected ending from `PLATFORM` so it passes on every OS. |

### 2026-05-30 — Restore layout-aware keyboard support via `native-keymap`

| Area | Path(s) | What changed |
|------|---------|--------------|
| Keyboard layout | `src/main/lib/keyboardLayout.ts`, `package.json`, `runtime-dependencies.ts`, `scripts/postinstall.ts` | Re-wired `native-keymap` (mirrors VSCode's `keyboardLayoutMainService`) so shortcut labels can follow the active OS layout instead of always showing static US-ANSI. `keyboardLayout.ts` was a no-op stub returning `EMPTY`; restored the lazy-loading wrapper (`getCurrentKeyboardLayout` + `getKeyMap` → `unshifted` glyph map, `onDidChangeKeyboardLayout` subscription). Added `native-keymap@3.3.9` to `package.json` and an externalized-runtime entry in `runtime-dependencies.ts` (whole-module copy + asar-unpack, since native `.node` files cannot live inside the asar). **Graceful degradation by design:** every entry point wraps the native `require`/calls in try/catch and falls back to `EMPTY` (renderer then uses the static US-ANSI display in `src/renderer/hotkeys/display.ts`), and `postinstall.ts` treats the native rebuild as non-fatal. **Known limitation:** `native-keymap@3.3.9` does not compile against Electron 40's V8 — its bundled `nan` uses `v8::Object::GetAlignedPointerFromInternalField`, now hard-deprecated (`error C4996`), so the ConPTY-style `electron-rebuild` fails. Until an upstream `native-keymap`/`nan` bump lands, the module is absent at runtime and the app silently uses the US-ANSI fallback — shortcuts work on every layout regardless. |

