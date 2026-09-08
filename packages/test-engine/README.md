# @convkit/test-engine

Conversational test engine for [Convkit](https://github.com/somaathetechster/Convkit).

Write automated tests for WhatsApp bots using a simple, readable API.

## Install

```bash
npm install --save-dev @convkit/test-engine
```

## Usage

Create a file ending in `.test.ts`:

```typescript
import { scenario } from '@convkit/test-engine'

scenario('greeting flow', async (ctx) => {
  await ctx.send('hello')
  await ctx.expect.text('Welcome')
  await ctx.expect.buttons(['Option A', 'Option B'])
})

scenario('button click', async (ctx) => {
  await ctx.send('hello')
  await ctx.click('Option A')
  await ctx.expect.text('You selected')
})
```

Run with the Convkit CLI:

```bash
convkit test
```

## API

### `scenario(name, fn, options?)`

Define a test scenario. Each scenario gets a fresh virtual user and session.

Options:
- `metadata` — initial user state injected before the scenario runs

### `ctx.send(text)`

Send a text message and wait for the bot to respond.

### `ctx.click(buttonTitle)`

Click a button by its title and wait for the bot to respond.

### `ctx.select(itemTitle)`

Select a list item by its title and wait for the bot to respond.

### `ctx.expect.text(expected)`

Assert the bot's last response contains the expected text.

### `ctx.expect.buttons(titles)`

Assert the bot's last response contains buttons with the given titles.

### `ctx.expect.list(options?)`

Assert the bot's last response contains a list message.

### `run(config)`

Execute all registered scenarios and return a `TestReport`.

### `printReport(report)`

Print a human-readable test report to the console.

### `printReportJson(report)`

Print the report as JSON.

## Requirements

- Node.js 18+
- A running Convkit server
- A running bot

## License

MIT
