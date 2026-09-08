# @convkit/cli

Command-line interface for [Convkit](https://github.com/somaathetechster/Convkit) — a local development environment for WhatsApp bots.

## Install

```bash
npm install -g @convkit/cli
```

## Commands

### `convkit dev`

Start the Convkit server and web UI together.

```bash
convkit dev
```

Opens:
- Server: http://localhost:4000
- Web UI: http://localhost:3000

### `convkit server`

Start the Convkit server only (no browser UI).

```bash
convkit server
```

### `convkit test`

Find and run test files in the current directory.

```bash
convkit test
convkit test examples/
convkit test --json
convkit test --server http://localhost:4000 --bot http://localhost:5000/webhook
```

Options:
- `--server <url>` — Convkit server URL (default: http://localhost:4000)
- `--bot <url>` — Bot webhook URL (default: http://localhost:5000/webhook)
- `--timeout <ms>` — Step timeout in ms (default: 5000)
- `--json` — Output results as JSON

### `convkit version`

Print the installed version.

## How it works

When installed globally, `convkit server` and `convkit dev` start the Convkit server
that is bundled inside the CLI package. No separate installation is needed.

When running from the Convkit monorepo (for development), the commands use the
monorepo's server directly.

The web UI ships only with the monorepo. Running `convkit dev` from a global install
starts the server and reports that the UI is unavailable; clone the repo if you want it.

## Requirements

- Node.js 18+

## License

MIT
