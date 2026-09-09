# Convkit

> Local development environment for WhatsApp bots and conversational applications.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-early%20development-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178c6.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

---

Convkit is an open-source local development and testing environment for WhatsApp bots and conversational applications.

Instead of deploying code to a live WhatsApp number every time you want to test a change, Convkit gives you a local environment where you can simulate users, messages, sessions, and events — without a WhatsApp account, a BSP provider, or an internet connection.

**Write code. Test locally. Ship confidently.**

---

## The Problem

Developing a WhatsApp bot typically requires infrastructure that has nothing to do with your code:

- A WhatsApp Business account
- A phone number registered with Meta or a BSP (Infobip, Twilio, etc.)
- Webhook URLs exposed to the internet
- HTTPS
- API credentials
- Real test users on real phones

Every time you want to test a change, you deploy, configure, and manually send messages from a phone.

This becomes increasingly painful as a bot grows more complex. A production bot may have hundreds of conversation paths:

```
Start → Language → Auth → Account → Asset → Amount → Payment → Confirmation → Success
```

And dozens of edge cases:

```
Invalid input / Timeout / Duplicate message / Expired session / Insufficient balance / Failed transaction
```

Manually testing every path, every time, is slow, expensive, and unreliable.

---

## The Solution

Convkit moves bot development to your local machine.

```
Developer → Convkit → Local Bot
```

No production WhatsApp account required.  
No live phone number required.  
No public webhook URL required.

Open your browser, create a simulated user, send a message, and see exactly what your bot does.

---

## What Convkit Provides

- **Browser-based emulator** — a local interface that simulates WhatsApp-style conversations
- **Virtual users** — configurable simulated users with phone numbers, countries, and state
- **Session management** — start, reset, replay, and inspect conversation sessions
- **Event inspector** — inspect every incoming and outgoing message event and payload
- **Network inspector** — see every webhook request and response with timing
- **Language-agnostic protocol** — connect bots written in any language over HTTP/WebSocket
- **Automated testing** *(planned)* — define conversation flows as tests, run them in CI
- **Conversation recording and replay** *(planned)* — record manual flows, replay them automatically

---

## Language Support

The Convkit server is built with TypeScript and Node.js.

Your bot does not need to be.

Convkit communicates with bots through a versioned, language-agnostic protocol over HTTP and WebSocket. A Python bot and a TypeScript bot connect to the same Convkit instance through the same protocol.

```
Convkit Server (TypeScript)
         │
         │  Convkit Protocol
         │
   ┌─────┼─────┐
   │     │     │
  JS   Python  Go
  Bot   Bot    Bot
```

**First-class SDK support** *(available now)*: JavaScript/TypeScript, Python  
**Community SDK support** *(planned)*: Go, Java, PHP, C#, Rust

```bash
npm install --save-dev @convkit/sdk   # JavaScript / TypeScript
pip install convkit                   # Python
```

> Any language that can make HTTP requests or open a WebSocket connection can communicate with Convkit directly, with or without an SDK.

---

## Quick Start

> Convkit's core platform, SDKs, CLI, provider adapters, and Docker support are functional and published. Persistent storage (PostgreSQL/Redis) and the plugin system are still in progress.

### Option A: Install from npm

```bash
npm install -g @convkit/cli
convkit dev
```

This works from any directory — no clone of this repository is required.

### Option B: Run from source *(contributors)*

**Requirements**

- Node.js 22+
- pnpm

```bash
git clone https://github.com/somaathetechster/convkit.git
cd convkit
pnpm install
pnpm dev
```

### Option C: Docker

From a clone of this repository:

```bash
docker build -t convkit . && docker run -p 3000:3000 -p 4000:4000 convkit
```

> Publishing on other ports works too — see [Running with Docker](#running-with-docker) below.

Then open `http://localhost:3000`.

Start your bot locally (example: a Node.js bot listening on port 5000), register it with Convkit, and begin testing.

---

## Running with Docker

Convkit ships a multi-stage `Dockerfile` that builds the workspace and runs the
Fastify server and the Next.js UI together in one container.

**Requirements**

- Docker 20.10+ (Compose v2 for the `docker compose` commands)

### Single container

```bash
docker build -t convkit .
docker run -p 3000:3000 -p 4000:4000 convkit
```

### Compose

```bash
docker compose up
```

Either way, open `http://localhost:3000` for the UI; the server is on
`http://localhost:4000`.

### ⚠️ Reaching Convkit from your bot's container

When your bot runs in its own container on the same Compose network, it must
reach Convkit by **service name**:

```
http://convkit:4000     ✅ correct
http://localhost:4000    ❌ wrong
```

`localhost` inside a container refers to *that container itself*, not the host
and not Convkit. A bot pointed at `http://localhost:4000` is talking to its own
empty port and will silently fail to deliver replies.

The same applies in reverse: register your bot's webhook with the address
Convkit can reach it on — its service name, e.g. `http://bot:5000/webhook`, not
`http://localhost:5000`.

`docker-compose.yml` contains a commented-out `bot` service template showing
this wiring.

> This only affects container-to-container traffic. Your **browser** runs on the
> host, so it correctly uses `http://localhost:3000` and `http://localhost:4000`.

### Publishing on different ports

Default ports:

```bash
docker run -p 3000:3000 -p 4000:4000 convkit
```

Custom ports work too — pass the addresses the **browser** will use:

```bash
docker run -p 8080:3000 -p 9000:4000 \
  -e CONVKIT_SERVER_URL=http://localhost:9000 \
  -e CONVKIT_WS_URL=ws://localhost:9000/ws \
  -e WEB_URL=http://localhost:8080 \
  convkit
```

**How it works:** the UI fetches `/api/config` on load and uses the
`serverUrl` / `wsUrl` it returns. That route is server-rendered on every
request, so it reads `CONVKIT_SERVER_URL` and `CONVKIT_WS_URL` from the
container environment at runtime. Nothing about the server address is
compiled into the JavaScript bundle, so `-e` at `docker run` time is enough
and no rebuild is needed.

**Why `WEB_URL` is still in that list.** It is the server's CORS allowlist, and
it must match the origin the browser loads the UI from — `http://localhost:8080`
above. Get it wrong and the URLs are all correct but the browser blocks every
API response.

The image defaults it to `http://localhost:3000`, so the default run needs no
environment variables at all. It cannot be defaulted any better than that:
Docker does not tell a container which host port it was published on, so when
you remap the UI port the container has no way to infer the new origin. That
makes `-e WEB_URL` the one variable you must still set by hand whenever you
change the UI's host port.

---

## Protocol

Convkit uses a versioned event protocol over HTTP and WebSocket.

Example event:

```json
{
  "version": "1.0",
  "event": "message.received",
  "timestamp": "2026-08-17T10:00:00Z",
  "user": {
    "id": "user_123",
    "phone": "2348012345678"
  },
  "message": {
    "id": "msg_123",
    "type": "text",
    "text": "Hello"
  }
}
```

Supported events:

```
message.received    message.sent
button.clicked      list.selected
media.received      session.started
session.reset       user.created
```

The protocol is versioned. Breaking changes result in a new version. Existing versions remain supported.

Full protocol documentation will be published in `/docs/protocol`.

---

## Repository Structure

```
convkit/
├── apps/
│   ├── web/          # Browser emulator (React / Next.js)
│   ├── server/       # Emulator server (Node.js / Fastify)
│   └── cli/          # CLI
│
├── packages/
│   ├── protocol/     # Protocol types and schemas
│   ├── schemas/      # JSON Schema definitions
│   ├── sdk-js/       # JavaScript / TypeScript SDK
│   ├── test-engine/  # Automated test runner
│   └── shared/       # Shared utilities
│
├── sdks/
│   └── python/       # Python SDK
│
├── adapters/         # Provider adapters (Infobip, Meta)
│
├── examples/
│   ├── node-bot/
│   ├── typescript-bot/
│   └── python-bot/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── docs/
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js, Fastify, TypeScript |
| Real-time | WebSocket (@fastify/websocket) |
| Protocol | HTTP + WebSocket + JSON + JSON Schema |
| Testing | Vitest, Playwright |
| Package management | pnpm |

PostgreSQL, Redis, and the plugin system are planned but not yet implemented. Docker is done — see [Running with Docker](#running-with-docker) below. None of it is required to run Convkit locally.

---

## Roadmap

### Phase 1 — Local Emulator
- [x] Core server architecture
- [x] Browser emulator UI
- [x] Virtual user simulation
- [x] Text message support
- [x] Session management
- [x] Event inspector
- [x] Convkit protocol v1
- [x] Node.js example bot
- [x] Python compatibility example
- [x] Unit, integration, and E2E tests

### Phase 2 — Rich Conversations
- [x] Buttons and interactive messages
- [x] List messages
- [ ] Media, location, document support
- [x] Multiple concurrent users
- [x] User state injection
- [x] Network inspector
- [x] Conversation recording
- [x] Conversation replay

### Phase 3 — Automated Testing
- [x] Test scenario definitions
- [x] Assertions
- [x] Test suites and reports
- [x] CLI
- [x] Headless mode
- [x] CI/CD integration

### Phase 4 — Ecosystem *(current)*
- [x] JavaScript / TypeScript SDK
- [x] Python SDK
- [x] Provider adapters (Meta, Infobip)
- [ ] Provider adapter (Twilio)
- [ ] Plugin system
- [x] Docker support
- [ ] Persistent storage (PostgreSQL)
- [ ] Redis (for real-time event pub/sub or session caching — scope TBD)

### Phase 5 — Advanced Testing
- [ ] AI-assisted test generation *(optional, no API key required for core)*
- [ ] Autonomous conversation exploration
- [ ] Load and concurrency testing
- [ ] Failure simulation

---

## Design Principles

**Local-first.** Everything should work on a developer's machine without external services.

**Language-agnostic.** The protocol never forces a language choice. Bots are written in whatever language makes sense for the project.

**Testable.** Conversational flows should be testable the same way application code is testable.

**Observable.** Developers should be able to see exactly what their bot is doing and why.

**Extensible.** SDKs, adapters, and plugins should be possible without modifying the core.

**Open.** The protocol and architecture are documented so the community can build on top of Convkit independently.

---

## Contributing

Convkit is being built as a genuine open-source project. Contributions are welcome across all areas:

- Core platform (server, protocol, emulator)
- Frontend UI
- SDKs (Python, Go, Java, PHP, and others)
- CLI
- Testing infrastructure
- Documentation
- Provider adapters
- Developer tooling

Before opening a pull request, please read [CONTRIBUTING.md](CONTRIBUTING.md).

For significant architectural changes, open a discussion first so the approach can be reviewed before implementation.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Convkit is maintained by [Domani](https://domani.studio).*
