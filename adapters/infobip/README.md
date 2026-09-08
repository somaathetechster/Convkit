# @convkit/adapter-infobip

Infobip adapter for [Convkit](https://github.com/somaathetechster/Convkit).

Lets you test your existing Infobip WhatsApp bot against Convkit without changing your bot code.

## How it works

```
Convkit UI
   ↓
ConvkitEvent (Convkit protocol)
   ↓
InfobipAdapter (this package)
   ↓
Infobip webhook format
   ↓
Your existing Infobip bot
   ↓
Infobip response format
   ↓
InfobipAdapter
   ↓
Convkit reply format
   ↓
Convkit UI
```

## Install

```bash
npm install @convkit/adapter-infobip
```

## Usage

```typescript
import { InfobipAdapter } from '@convkit/adapter-infobip'

const adapter = new InfobipAdapter({
  convkitUrl: 'http://localhost:4000',
  botWebhookUrl: 'http://localhost:5000/webhook',
  port: 6000
})

adapter.listen()
```

Then in Convkit, set your webhook URL to `http://localhost:6000/webhook`.

Your bot receives standard Infobip webhooks. The adapter handles the translation.

## What gets translated

Inbound — Convkit event to the `results[]` envelope your bot already parses:

| Convkit message | Infobip `message.type` |
| --- | --- |
| `text` | `TEXT` |
| `button` | `INTERACTIVE_BUTTON_REPLY` |
| `list` | `INTERACTIVE_LIST_REPLY` |

Outbound — your bot's `messages[].content` back into a Convkit reply:

| Infobip content | Convkit reply |
| --- | --- |
| `text` | `text` |
| `interactive` / `button` | `buttons` |
| `interactive` / `list` | `list` |

Content types the adapter does not recognise are skipped rather than forwarded, so an
unsupported message never reaches the Convkit UI as a broken reply.

## Transformers

The two transform functions are exported on their own if you want to drive them directly,
for example from a test:

```typescript
import { convkitEventToInfobip, infobipResponseToConvkit } from '@convkit/adapter-infobip'
```

## License

MIT
