# @convkit/sdk

JavaScript/TypeScript SDK for connecting bots to [Convkit](https://github.com/somaathetechster/Convkit).

## Install

```bash
npm install @convkit/sdk
```

## Usage

```typescript
import { ConvkitBot } from '@convkit/sdk'

const bot = new ConvkitBot({ emulatorUrl: 'http://localhost:4000' })

bot.on('message', async (event) => {
  await bot.replyText(event.sessionId, 'Hello! 👋')
})

bot.on('button.clicked', async (event) => {
  await bot.replyButtons(event.sessionId, 'Choose an option:', [
    { id: 'yes', title: 'Yes' },
    { id: 'no', title: 'No' }
  ])
})

bot.on('list.selected', async (event) => {
  await bot.replyText(event.sessionId, `You selected: ${event.message.itemTitle}`)
})

bot.listen(5000)
```

## API

### `new ConvkitBot(config)`

- `emulatorUrl` — URL of the running Convkit server (default: `http://localhost:4000`)
- `webhookPath` — path to listen on (default: `/webhook`)

### `bot.on(event, handler)`

Register a handler for an event type:
- `message` or `message.received`
- `button.clicked`
- `list.selected`

### `bot.replyText(sessionId, text)`

Send a text message back to the user.

### `bot.replyButtons(sessionId, text, buttons)`

Send a button message. `buttons` is an array of `{ id, title }`.

### `bot.replyList(sessionId, text, buttonText, sections)`

Send a list message. `sections` is an array of `{ title, items }` where each item is `{ id, title, description? }`.

### `bot.reply(sessionId, message)`

Send a raw `ConvkitReply` message.

### `bot.listen(port)`

Start the webhook server.

### `bot.close()`

Stop the webhook server.

## Requirements

- Node.js 18+
- A running Convkit server (`convkit server` or `convkit dev`)

## License

MIT
