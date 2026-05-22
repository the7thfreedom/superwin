# SuperWin

> An unofficial **Windows port** of [superset-sh/superset](https://github.com/superset-sh/superset) — the code editor for the AI agents era.

[![License: ELv2](https://img.shields.io/badge/License-Elastic%202.0-blue.svg)](LICENSE.md)
[![Upstream](https://img.shields.io/badge/upstream-superset--sh%2Fsuperset-orange)](https://github.com/superset-sh/superset)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4)](#)

## ⚠️ Disclaimer

**SuperWin is an unofficial, community-maintained Windows port.** It is **not affiliated with, endorsed by, or sponsored by** the superset-sh team. For the official macOS version, please visit [superset.sh](https://superset.sh).

All trademarks and product names belong to their respective owners.

## About

[Superset](https://github.com/superset-sh/superset) by superset-sh is a powerful tool for orchestrating CLI-based coding agents (Claude Code, Codex, Cursor, etc.) across isolated git worktrees. However, the official release **only supports macOS**.

**SuperWin** ports the Superset codebase to run natively on **Windows 10 / 11**, with platform-specific adjustments for:

- File path handling (backslash vs. forward slash)
- Process management and terminal integration (PowerShell / cmd / WSL)
- Build tooling for Windows (replacing macOS-only dependencies)
- Native UI conventions and keyboard shortcuts (Ctrl instead of ⌘)


## Relationship to Upstream

| Aspect | Details |
|--------|---------|
| Based on | [superset-sh/superset](https://github.com/superset-sh/superset) |
| Upstream license | Elastic License 2.0 (ELv2) |
| This fork's license | Elastic License 2.0 (ELv2) — same as upstream |
| Sync strategy | Periodic rebase from upstream `main` |
| Affiliation | None. This is an independent community port. |

If you are the upstream maintainer and have concerns about this project, please [open an issue](../../issues) — happy to align.

## Requirements

| Requirement | Details |
|-------------|---------|
| OS | Windows 10 (1809+) or Windows 11 |
| Runtime | Bun v1.0+ for Windows |
| Version Control | Git for Windows 2.40+ |
| GitHub CLI | gh (optional) |
| Shell | PowerShell 7+ recommended |

## Installation

> Download links coming soon. For now, build from source.

### Build from Source

```powershell
git clone https://github.com/the7thfreedom/superwin.git
cd superwin

# Setup environment
Copy-Item .env.example .env

# Install dependencies
bun install

# Run dev
bun run dev

# Build Windows installer
bun run build:win
```

## What's Different from Upstream

| Area | Change |
|------|--------|
| File paths | Normalized to handle Windows backslashes |
| Terminal | Replaced macOS pty with Windows ConPTY |
| Shortcuts | ⌘ → Ctrl, ⌥ → Alt |
| Build | Electron-builder targets nsis / msi |
| Caddy setup | Adapted for Windows installation paths |

See [docs/windows-changes.md](docs/windows-changes.md) for full details.

## Contributing

Contributions are welcome! Please note:

1. Keep the codebase compatible with upstream where possible
2. Windows-specific changes should be isolated and documented
3. All contributions must be compatible with the **Elastic License 2.0**

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is distributed under the **Elastic License 2.0 (ELv2)**, the same license as the upstream [superset-sh/superset](https://github.com/superset-sh/superset). See [LICENSE.md](LICENSE.md) for the full text.

**Summary of ELv2 restrictions** (you may NOT):
- Provide this software as a hosted/managed service to third parties
- Circumvent license key functionality
- Remove or modify any license, copyright, or other notices

## Acknowledgments

Massive thanks to the [superset-sh team](https://github.com/superset-sh) for building Superset and making the source code available. SuperWin would not exist without their work.

