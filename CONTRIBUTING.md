# Contributing to Convkit

Contributions are welcome across all areas of the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Convkit.git`
3. Install dependencies: `pnpm install`
4. Start the server: `cd apps/server && pnpm dev`
5. Start the web app: `cd apps/web && pnpm dev`

## Before Opening a Pull Request

- Run type checks: `npx tsc --noEmit` in `apps/server` and `packages/protocol`
- Run tests: `cd apps/server && pnpm test --run`
- Make sure the server and web app build without errors

## Areas Open for Contribution

- Core server (session management, routing, protocol)
- Web UI (emulator, event inspector, user management)
- Protocol types
- SDKs (JavaScript/TypeScript, Python, Go)
- CLI
- Documentation
- Provider adapters
- Example bots

## For Large Changes

Open an issue or discussion first so the approach can be reviewed before implementation.

## Commit Style

Use conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling, config, dependencies
- `docs:` documentation
- `test:` tests
- `ci:` CI/CD changes