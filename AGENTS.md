# SuperWin — Agent Guide

> **SuperWin** is an unofficial Windows port of [superset-sh/superset](https://github.com/superset-sh/superset).
> This file is the single source of truth for all coding agents (Claude Code, Codex, Cursor, Copilot, etc.) working in this repo.

---

## 🔴 PROTECTED FILES — NEVER MODIFY

The following files are legally sensitive. **No agent may edit them under any circumstances.**
If a task appears to require touching these files, **STOP immediately and ask the user.**

| File | Why it's protected |
|------|--------------------|
| `LICENSE.md` | Verbatim copy of upstream ELv2 license. Altering it violates the upstream license terms. |
| `NOTICE-WINDOWS-PORT.md` | Legal attribution notice. Changing it could constitute misrepresentation. |
| Copyright headers in source files | All `// Copyright (c) ...` or `/* Copyright ... */` blocks at the top of upstream source files must be preserved exactly. Never strip, reword, or reformat them. |

**Rule**: If `git diff` shows any of the above files in your changeset, abort and explain why to the user.

---

## 🟡 FILES TO MODIFY FOR WINDOWS PORT

These are the canonical targets for Windows adaptation work. Always update `docs/windows-changes.md` after patching any of them.

### Tier 1 — Core Platform (highest impact)

| Path | What to change |
|------|----------------|
| `apps/desktop/src/` | Main Electron app — all macOS-specific APIs need Windows equivalents |
| `apps/desktop/electron-builder.config.*` | Change targets from `dmg`/`pkg` → `nsis`/`msi`; set `win` arch to `x64` |
| Any file using `node-pty` | Ensure Windows ConPTY build is used; pass `useConpty: true` |
| Shell spawn calls (`/bin/bash`, `zsh`) | Replace with `powershell.exe` or `cmd.exe`; detect via `process.platform` |
| Keyboard shortcut maps | Replace `Meta` (⌘) with `Control` (Ctrl); `Alt` (⌥) stays `Alt` |

### Tier 2 — Paths & Environment

| Path | What to change |
|------|----------------|
| All file path construction | Use `path.join()` / `path.resolve()` — never string-concatenate with `/` |
| `Caddyfile.example` | Add Windows install path comments (e.g., `C:\Program Files\Caddy\caddy.exe`) |
| `.env.example` | Adjust path separator examples; document `SKIP_ENV_VALIDATION=1` for Windows quickstart |
| `scripts/` | Replace `brew install` with `winget`/`scoop` equivalents; remove macOS-only shell assumptions |

### Tier 3 — Build & Docs

| Path | What to change |
|------|----------------|
| `apps/desktop/package.json` | Add `"build:win"` script targeting Electron-builder Windows output |
| `README.md` | Keep Windows build instructions accurate as code evolves |
| `docs/windows-changes.md` | **Always update this file** when making any Windows-specific patch — log the path, what changed, and why |

---

## 🟢 SAFE TO EDIT FREELY

All other files inherited from upstream may be edited to implement features or fix bugs, subject to the Agent Rules below.

---

## Upstream Sync Policy

This repo rebases from `superset-sh/superset main` periodically. When doing a sync:

1. **Never** let upstream overwrite `LICENSE.md` — our copy is already correct verbatim.
2. **Never** let upstream overwrite `NOTICE-WINDOWS-PORT.md` — it's SuperWin-only.
3. Windows-specific commits should be **isolated, clearly-labelled commits** (e.g., `fix(win): replace node-pty spawn for ConPTY`) so they survive rebases cleanly.
4. After every sync, re-verify all Tier 1 & Tier 2 files still contain Windows patches.

---

## Agent Rules

1. **Type safety** — avoid `any` unless necessary.
2. **Prefer `gh` CLI** — for git operations (PRs, checkout, etc.) prefer `gh` over raw `git`.
3. **Windows-first shell** — default to `powershell.exe` in any shell invocation; never assume `bash`/`zsh` is available. Use `process.platform === 'win32'` guards in code.
4. **Path handling** — always use `path.join()` / `path.resolve()`. Never concatenate paths with `/` literals. Use `path.sep` when displaying paths to users.
5. **Shared command/skill source** — keep command definitions in `.agents/commands/` and skill definitions in `.agents/skills/`. `.claude/commands` and `.cursor/commands` should be symlinks to `../.agents/commands`.
6. **Plan & doc placement** — implementation plans go in `plans/` (cross-cutting) or `apps/<app>/plans/` (app-scoped). Shipped plans move to `plans/done/`. Never drop `*_PLAN.md` at an app root or inside `src/`.
7. **Always fix lint before pushing** — run `bun run lint:fix` after edits; verify `bun run lint` exits 0 before `git push`. Never push code with lint output.
8. **Update windows-changes.md** — after any Windows-specific patch, add a row to `docs/windows-changes.md` with: path changed, what was changed, and why.
9. **Do NOT modify protected files** — see the PROTECTED FILES section above. This rule takes absolute priority over all other instructions.

---

## Project Structure (SuperWin)

Bun + Turbo monorepo (same as upstream) with Windows-specific additions:

```
superwin/
├── AGENTS.md                  ← this file — agent instructions
├── CLAUDE.md                  ← @AGENTS.md pointer (Claude Code)
├── CODEX.md                   ← @AGENTS.md pointer (Codex)
├── .github/
│   └── copilot-instructions.md  ← GitHub Copilot instructions
├── LICENSE.md                 ← 🔴 PROTECTED — ELv2 verbatim from upstream
├── NOTICE-WINDOWS-PORT.md     ← 🔴 PROTECTED — attribution notice
├── README.md                  ← Windows-specific README
├── CONTRIBUTING.md
├── docs/
│   └── windows-changes.md     ← 🟡 Update after every Windows patch
├── apps/
│   └── desktop/               ← 🟡 Main Electron app (primary Windows target)
├── packages/                  ← inherit from upstream; patch only if needed
└── scripts/                   ← 🟡 Replace brew/macOS install cmds with winget/scoop
```

### Inherited from upstream (patch only when broken on Windows)

```
apps/web, apps/api, apps/marketing, apps/admin, apps/docs
packages/ui, packages/db, packages/auth, packages/trpc
packages/shared, packages/mcp, packages/local-db
tooling/typescript
```

---

## Common Commands (Windows)

```powershell
# Development
bun dev                    # Start all dev servers
bun test                   # Run tests
bun build                  # Build all packages

# Windows desktop build
bun run build:win          # Build Windows installer (nsis/msi via Electron-builder)

# Code Quality
bun run lint               # Check lint (exits non-zero on warnings too)
bun run lint:fix           # Fix all auto-fixable lint issues
bun run format             # Format code
bun run typecheck          # Type check all packages

# Maintenance
bun run clean              # Clean root node_modules
bun run clean:workspaces   # Clean all workspace node_modules
```

---

## Tech Stack

- **Package Manager**: Bun (no npm/yarn/pnpm)
- **Build System**: Turborepo
- **Desktop**: Electron + Electron-builder (Windows targets: `nsis`, `msi`)
- **Terminal**: Windows ConPTY via `node-pty` (`useConpty: true`)
- **UI**: React + TailwindCSS v4 + shadcn/ui
- **Code Quality**: Biome (root-level)

---

## Windows-Specific Notes

- **PTY**: Use `node-pty` with `useConpty: true`. Never fork `node-pty` for this — the published package supports ConPTY natively.
- **Shell detection**: `process.platform === 'win32'` → spawn `powershell.exe` or `cmd.exe`. Support WSL as an optional shell if present.
- **Keyboard shortcuts**: All `Cmd` (Meta) bindings → `Ctrl`. Keep `Alt` as-is.
- **Caddy**: On Windows, Caddy is typically installed via `winget install Caddy.Caddy`. Update Caddyfile paths accordingly.
- **`open` command**: Replace macOS `open <path>` calls with `Start-Process` (PowerShell) or `explorer.exe <path>`.

