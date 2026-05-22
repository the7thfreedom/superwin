# Cross-Platform Electron AI Scaffold

> Scaffold lineage: [Yanhu007/Electron-App-Scaffold-for-AI](https://github.com/Yanhu007/Electron-App-Scaffold-for-AI)

## Purpose

Define the architectural baseline this repository inherits from the upstream
scaffold so that contributors keep the desktop app coherent, local-first, and
safe to extend with AI agents.

## Scope

This document covers:

- the three Electron process boundaries (main / preload / renderer)
- the typed IPC contract surface (tRPC)
- the shared local data layer (Drizzle + SQLite)
- the build & packaging baseline (electron-vite + electron-builder)

It does **not** repeat product-specific feature documentation. For runtime
detail, see the `HOST_SERVICE_*`, `KEYBOARD_SYSTEM`, `TERMINAL_HOST_EVENTS`,
and `WINDOWS_AUDIT` docs in this folder.

## Do

- Keep all renderer code browser-safe. Never import Node builtins in
  `src/renderer/**`.
- Route every renderer ↔ main interaction through the typed tRPC surface in
  `src/lib/trpc/**`.
- Use `observable(...)` (not async generators) for tRPC subscriptions —
  `trpc-electron` only supports observables.
- Persist data with Drizzle + SQLite via `packages/local-db`.
- Keep packaging configuration in `electron-builder.ts` and renderer/main
  build configuration in `electron.vite.config.ts`.
- Co-locate tests, hooks, utils, stores, and providers next to the file that
  uses them. Promote shared modules upward only when used by 2+ siblings.

## Don't

- Don't add Next.js, hosted DB drivers, Vercel/Clerk/Neon integrations, or
  any other server-side runtime.
- Don't introduce un-typed IPC channels.
- Don't hand-edit `packages/db/drizzle/*.sql` — generate migrations with
  `bunx drizzle-kit generate --name="<snake_case_name>"`.
- Don't ship features that bypass the main-process security boundary
  (no `nodeIntegration` in the renderer, no `enableRemoteModule`).
- Don't add multi-component files; one component per file.

## Decide

When extending the app, decide in this order:

1. **Process boundary** — does this belong in main, preload, or renderer?
2. **Persistence** — does it need durable state? If so, add a Drizzle schema
   change in `packages/db` and a migration.
3. **IPC contract** — define the input/output types in `src/shared` and
   expose them via the tRPC router in `src/lib/trpc`.
4. **Tests** — add unit tests next to the changed source.
5. **Packaging** — does the change touch native modules or resources that
   need `electron-builder` configuration updates?

## Validate

Before shipping any change:

- `bun run lint` exits 0.
- `bun run typecheck` exits 0.
- `bun test` passes for changed packages.
- For UI changes, exercise the renderer in `bun dev` and verify no Node
  builtins leak into the renderer bundle.

## Cross-Platform Notes

The app targets macOS, Linux, and Windows. Known cross-platform constraints
are tracked in `docs/WINDOWS_AUDIT.md`. When adding shell-out logic, native
helpers, or file-system paths, consult that document and add Windows
branches as needed.
