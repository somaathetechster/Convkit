# @convkit/protocol

Shared TypeScript types for the [Convkit](https://github.com/somaathetechster/Convkit) ecosystem.

This package defines the wire format that the Convkit server, SDK, test engine, and
CLI all speak. Bot authors normally get these types transitively via
[`@convkit/sdk`](https://www.npmjs.com/package/@convkit/sdk) and rarely need to
install it directly.

## Install

```bash
npm install @convkit/protocol
```

## Usage

```typescript
import {
  PROTOCOL_VERSION,
  isTextMessage,
  type ConvkitEvent,
  type ConvkitReply
} from '@convkit/protocol'

function handle(event: ConvkitEvent): ConvkitReply {
  if (isTextMessage(event.message)) {
    return { type: 'text', text: `You said: ${event.message.text}` }
  }
  return { type: 'text', text: 'Unsupported message type' }
}
```

## Exports

**Constant** — `PROTOCOL_VERSION`

**Inbound types** — `ConvkitUser`, `ConvkitEvent`, `ConvkitMessage`, `TextMessage`,
`ButtonMessage`, `ListMessage`, `EventType`

**Outbound types** — `ConvkitReply`, `TextReply`, `ButtonsReply`, `ListReply`,
`OutboundMessage`

**Recording types** — `ConvkitRecording`, `RecordedMessage`

**Type guards** — `isTextMessage`, `isButtonMessage`, `isListMessage`

## Requirements

- Node.js 18+

## License

MIT
