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

**First-class SDK support** *(planned)*: JavaScript/TypeScript, Python  
**Community SDK support** *(planned)*: Go, Java, PHP, C#, Rust

> SDKs are planned. In the interim, any language that can make HTTP requests or open a WebSocket connection can communicate with Convkit directly.

---

## Quick Start

> ⚠️ Convkit is in early development. The setup below reflects the intended local development experience. Full instructions will be added as the initial implementation stabilizes.

**Requirements**

- Node.js 20+
- pnpm

```bash
git clone https://github.com/DomaniLabs/convkit.git
cd convkit
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

Start your bot locally (example: a Node.js bot listening on port 5000), register it with Convkit, and begin testing.

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
│   └── cli/          # CLI (planned)
│
├── packages/
│   ├── protocol/     # Protocol types and schemas
│   ├── schemas/      # JSON Schema definitions
│   ├── sdk-js/       # JavaScript / TypeScript SDK (planned)
│   ├── test-engine/  # Automated test runner (planned)
│   └── shared/       # Shared utilities
│
├── sdks/
│   └── python/       # Python SDK (planned)
│
├── adapters/         # Provider adapters (planned)
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
| Real-time | WebSocket / Socket.IO |
| Protocol | HTTP + WebSocket + JSON + JSON Schema |
| Testing | Vitest, Playwright |
| Package management | pnpm |

Future infrastructure (PostgreSQL, Redis, Docker) will be introduced progressively as the project grows. None of it is required to run Convkit locally.

---

## Roadmap

### Phase 1 — Local Emulator *(current)*
- [ ] Core server architecture
- [ ] Browser emulator UI
- [ ] Virtual user simulation
- [ ] Text message support
- [ ] Session management
- [ ] Event inspector
- [ ] Convkit protocol v1
- [ ] Node.js example bot
- [ ] Python compatibility example
- [ ] Unit, integration, and E2E tests

### Phase 2 — Rich Conversations
- [ ] Buttons and interactive messages
- [ ] List messages
- [ ] Media, location, document support
- [ ] Multiple concurrent users
- [ ] User state injection
- [ ] Network inspector
- [ ] Conversation recording
- [ ] Conversation replay

### Phase 3 — Automated Testing
- [ ] Test scenario definitions
- [ ] Assertions
- [ ] Test suites and reports
- [ ] CLI
- [ ] Headless mode
- [ ] CI/CD integration

### Phase 4 — Ecosystem
- [ ] JavaScript / TypeScript SDK
- [ ] Python SDK
- [ ] Provider adapters (Meta, Infobip, Twilio)
- [ ] Plugin system
- [ ] Docker support
- [ ] Persistent storage (PostgreSQL)

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
