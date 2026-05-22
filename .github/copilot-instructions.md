# SuperWin — GitHub Copilot Instructions

SuperWin is an **unofficial Windows port** of [superset-sh/superset](https://github.com/superset-sh/superset).
This file guides GitHub Copilot when suggesting code in this repository.

---

## 🔴 PROTECTED FILES — NEVER SUGGEST CHANGES TO

| File | Reason |
|------|--------|
| `LICENSE.md` | Verbatim ELv2 license from upstream. Must never be altered. |
| `NOTICE-WINDOWS-PORT.md` | Legal attribution notice. Must never be altered. |
| Copyright header comments | All `// Copyright (c) ...` blocks in source files must be preserved verbatim. |

If asked to modify these files, decline and explain the legal constraint.

---

## Coding Guidelines

### Platform
- Target **Windows 10 (1809+) and Windows 11**.
- Always guard platform-specific code with `process.platform === 'win32'`.
- Suggest `powershell.exe` as the default shell. Support `cmd.exe` as fallback.
- Use `path.join()` / `path.resolve()` for all file paths. Never concatenate with `/`.

### Terminal / PTY
- Use `node-pty` with `{ useConpty: true }` for pseudo-terminal on Windows.
- Never suggest macOS-only PTY approaches.

### Keyboard Shortcuts
- Replace `Meta` (⌘) → `Control` (Ctrl).
- Keep `Alt` (⌥) as `Alt`.

### Electron Build
- Build targets: `nsis` (installer) and `msi`. Never suggest `dmg` or `pkg`.
- Suggest `electron-builder` with `win` platform config.

### Shell Commands
- Replace `brew install` → `winget install` or `scoop install`.
- Replace `open <path>` → `Start-Process "<path>"` (PowerShell) or `explorer.exe "<path>"`.
- Replace `/bin/bash`/`zsh` → `powershell.exe`/`cmd.exe`.

### Code Quality
- Run `bun run lint:fix` after any edit.
- `bun run lint` must exit 0 before pushing.
- Package manager is **Bun** only — never suggest `npm`, `yarn`, or `pnpm`.

---

## Files to Modify for Windows Work

| File / Directory | Why |
|-----------------|-----|
| `apps/desktop/src/` | Core Electron app — primary Windows adaptation target |
| `apps/desktop/electron-builder.config.*` | Change to Windows build targets |
| Any `node-pty` usage | Add `useConpty: true` |
| Shell spawn calls | Replace macOS shells with Windows equivalents |
| `scripts/` | Replace macOS install commands |
| `Caddyfile.example` | Add Windows install path guidance |
| `.env.example` | Adjust for Windows paths |
| `docs/windows-changes.md` | Log every Windows-specific change made |

---

## What NOT to Do

- ❌ Do not suggest `chmod`, `chown`, or Unix-only permissions APIs.
- ❌ Do not suggest `process.env.HOME` — use `process.env.USERPROFILE` or `os.homedir()`.
- ❌ Do not suggest macOS-only Electron APIs (e.g., `systemPreferences.getUserDefault`).
- ❌ Do not modify `LICENSE.md` or `NOTICE-WINDOWS-PORT.md`.
- ❌ Do not remove or alter copyright comment headers in source files.
- ❌ Do not use `npm`, `yarn`, or `pnpm` — Bun only.
