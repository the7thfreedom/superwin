# Windows Compatibility Audit

Tracking doc for the Windows-support migration described in
[plans/20260519-1430-windows-platform-support.md](../../../plans/20260519-1430-windows-platform-support.md).

This file is the single source of truth for **every** Mac-only or POSIX-only
coupling discovered in the desktop codebase. Add a row whenever a new
incompatibility is found; mark it `Fixed (Mxx)` once the corresponding
milestone closes it out.

## Status legend

- 🔴 **Blocker** — App will not start or core flow breaks on Windows.
- 🟠 **Functional** — Feature degrades or misbehaves on Windows.
- 🟡 **Cosmetic / dev-only** — Affects developer experience or visuals only.
- 🟢 **Fixed (Mxx)** — Closed; PR linked.

## Inventory

| # | File / Path | Issue | Severity | Owner Milestone | Status |
|---|-------------|-------|----------|-----------------|--------|
| 1 | [src/main/terminal-host/index.ts:63](../src/main/terminal-host/index.ts#L63) | `~/.superset/terminal-host.sock` (Unix Domain Socket) | 🔴 | M2 | open |
| 2 | [src/main/lib/terminal-host/client.ts:79](../src/main/lib/terminal-host/client.ts#L79) | Same UDS path on client | 🔴 | M2 | open |
| 3 | [src/main/pty-daemon/index.ts:50](../src/main/pty-daemon/index.ts#L50) | `--socket=<path>` flag assumes UDS | 🔴 | M2 | open |
| 4 | [src/main/terminal-host/test-helpers.ts:14](../src/main/terminal-host/test-helpers.ts#L14) | `probe.sock` literal | 🟠 | M2 | open |
| 5 | [src/main/terminal-host/session.ts:1171](../src/main/terminal-host/session.ts#L1171) | `process.env.SHELL \|\| "/bin/zsh"` (has `win32` branch using COMSPEC ✓) | 🟠 | M3 | partial |
| 6 | [src/lib/trpc/routers/workspaces/utils/teardown.ts:47](../src/lib/trpc/routers/workspaces/utils/teardown.ts#L47) | `(darwin ? "/bin/zsh" : "/bin/bash")` — no Windows branch | 🔴 | M3 | open |
| 7 | [src/lib/trpc/routers/workspaces/utils/teardown.ts:117](../src/lib/trpc/routers/workspaces/utils/teardown.ts#L117) | `process.kill(-pid, "SIGKILL")` — process group + POSIX signal | 🔴 | M4 | open |
| 8 | [src/main/terminal-host/signal-handlers.ts:130](../src/main/terminal-host/signal-handlers.ts#L130) | Listens on `SIGHUP` (does not exist on Windows) | 🔴 | M4 | open |
| 9 | [src/main/terminal-host/pty-subprocess.ts:389](../src/main/terminal-host/pty-subprocess.ts#L389) | Defaults to `SIGHUP` when killing PTY | 🔴 | M4 | open |
| 10 | [scripts/patch-dev-protocol.ts:208](../scripts/patch-dev-protocol.ts#L208) | `/usr/libexec/PlistBuddy` invocations | 🔴 (dev) | M5 | open |
| 11 | [scripts/clean-launch-services.ts:16](../scripts/clean-launch-services.ts#L16) | macOS `lsregister` (already early-returns on non-darwin ✓) | 🟢 | M5 | safe |
| 12 | [src/main/lib/apple-events-permission.ts:18](../src/main/lib/apple-events-permission.ts#L18) | `osascript` invocation | 🟠 | M5 | open |
| 13 | [src/main/lib/play-sound.ts:31](../src/main/lib/play-sound.ts#L31) | `afplay` on darwin, `paplay`/`aplay` on linux — no Windows branch | 🔴 | M5 | open |
| 14 | [src/main/lib/bundled-cli.ts:56](../src/main/lib/bundled-cli.ts#L56) | `#!/bin/sh` shim generation | 🔴 | M6 | open |
| 15 | [src/lib/trpc/routers/external/helpers.ts:90](../src/lib/trpc/routers/external/helpers.ts#L90) | Only branches `darwin` vs "linux"; Windows falls into Linux branch | 🔴 | M6 | open |
| 16 | [src/lib/trpc/routers/system.ts:8](../src/lib/trpc/routers/system.ts#L8) | Hard-coded `/opt/homebrew/bin/gh`, `/usr/local/bin/gh` | 🟠 | M7 | open |
| 17 | [src/main/index.ts:366](../src/main/index.ts#L366) | `/System/Applications/Utilities/Terminal.app/...` font scan path | 🟡 | M7 | open |
| 18 | [.superset/lib/setup/steps.sh](../../../.superset/lib/setup/steps.sh) | POSIX bash setup script | 🔴 | M8 | open |
| 19 | [.superset/lib/teardown/steps.sh](../../../.superset/lib/teardown/steps.sh) | POSIX bash teardown script | 🔴 | M8 | open |
| 20 | [.superset/lib/common.sh](../../../.superset/lib/common.sh) | POSIX bash helpers | 🔴 | M8 | open |
| 21 | [src/main/lib/agent-setup/templates/codex-wrapper-exec.template.sh](../src/main/lib/agent-setup/templates/codex-wrapper-exec.template.sh) | Bash wrapper template for agents | 🔴 | M4 | open |
| 22 | [src/renderer/lib/terminal/clipboard-shortcuts.ts:15](../src/renderer/lib/terminal/clipboard-shortcuts.ts#L15) | Mac key-chord assumptions partially mapped | 🟠 | M9 | partial |
| 23 | [src/renderer/lib/terminal/line-edit-translations.ts:17](../src/renderer/lib/terminal/line-edit-translations.ts#L17) | Mac `Cmd+` line-edit chords (Windows path noted in comment but unverified) | 🟠 | M9 | partial |
| 24 | [electron-builder.ts:104-135](../electron-builder.ts#L104) | `mac:` block (notarize, entitlements, NSBonjour) required path; no Windows signing config | 🟠 | M10 | open |
| 25 | [.github/workflows/build-desktop.yml:32](../../../.github/workflows/build-desktop.yml#L32) | No Windows job (now added as soft-fail in `build-desktop-windows.yml`) | 🟢 | M0 | soft-fail wired |
| 26 | [.github/workflows/build-cli.yml](../../../.github/workflows/build-cli.yml) | No `win32` target | 🟠 | M10 | open |
| 27 | Worktree path `%USERPROFILE%\.superset\worktrees\<project>\<branch>` | Exceeds `MAX_PATH` (260) without long-path support | 🔴 | M7 | open |
| 28 | [scripts/validate-native-runtime.ts:458](../scripts/validate-native-runtime.ts#L458) | win32 branch only "skips" — no real validation | 🟠 | M10 | open |
| 29 | [scripts/copy-native-modules.ts:281](../scripts/copy-native-modules.ts#L281) | Three-platform branches present but win32 path untested | 🟠 | M10 | open |
| 30 | [scripts/build-bundled-cli.ts:6](../scripts/build-bundled-cli.ts#L6) | `SupportedPlatform` includes `"win32"` but no Bun-Windows binary fetched | 🟠 | M6 | open |
| 31 | [src/main/lib/terminal/env.ts:45](../src/main/lib/terminal/env.ts#L45) | `FALLBACK_SHELL` already platform-aware ✓ | 🟢 | M3 | safe |
| 32 | [src/main/lib/tree-kill.ts](../src/main/lib/tree-kill.ts) | Uses `tree-kill` npm package — already supports Windows via `taskkill` ✓ | 🟢 | M4 | safe |

## Milestone progress

- **M0 (Foundation)** — ✅ landed: Windows CI workflow ([`.github/workflows/build-desktop-windows.yml`](../../../.github/workflows/build-desktop-windows.yml), soft-fail) + this audit doc.
- **M1 (Platform abstraction layer)** — ✅ landed: `PlatformAdapter` interface ([src/main/lib/platform/](../src/main/lib/platform/)) with `darwinAdapter`, `linuxAdapter`, `win32Adapter`. Co-located tests + `setPlatformForTesting` helper. Pending: runtime verification (`bun test`) — this host has no `bun` installed; CI will exercise.
- **M2 (IPC migration)** — open. Next: replace UDS literals in [`terminal-host/index.ts`](../src/main/terminal-host/index.ts), [`lib/terminal-host/client.ts`](../src/main/lib/terminal-host/client.ts), [`pty-daemon/index.ts`](../src/main/pty-daemon/index.ts), [`terminal-host/test-helpers.ts`](../src/main/terminal-host/test-helpers.ts) with `platform.ipcEndpoint("terminal-host")`. Rename `--socket=` daemon flag to `--endpoint=`.

## Sweep patterns to re-run quarterly

Run these greps before each milestone exit to catch regressions:

```bash
# POSIX shell hardcoding
grep -rE '"/bin/(sh|bash|zsh|ksh)"' src

# Mac-only utilities
grep -rE '\b(osascript|afplay|pbcopy|pbpaste|PlistBuddy|lsregister|sw_vers|defaults\s+write)\b' .

# Socket paths
grep -rE '\.sock["'\''`]' src

# POSIX signals not on Windows
grep -rE '"SIG(HUP|USR1|USR2|WINCH|QUIT)"' src

# Process group kill (negative pid)
grep -rE 'process\.kill\(\s*-' src

# Hard-coded Homebrew paths
grep -rE '/(opt/homebrew|usr/local)/bin/' src

# Tilde paths in strings (potential `~` not expanded on Windows)
grep -rE '"~/' src

# Hardcoded /System or /Library
grep -rE '"/System|"/Library|"/Applications' src

# Symlinks that may need elevation on Windows
grep -rn 'fs\.symlink\|symlinkSync' src
```

## Open Questions (mirror of plan §Open Questions)

1. **Code signing**: EV cert vs unsigned-beta vs Microsoft Store?
2. **Default shell on Windows**: `pwsh.exe` (user install) vs `powershell.exe` (preinstalled) vs `cmd.exe`?
3. **Bundled `bun`**: ship `bun-windows-x64.exe` or fall back to `node`?
4. **Auto-updater channel**: confirm `latest.yml` covers Windows alongside `latest-mac.yml`.
5. **PATH integration**: `setx`/registry vs PowerShell profile vs manual?

Resolve before exiting M0.
