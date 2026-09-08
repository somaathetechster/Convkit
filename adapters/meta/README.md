# @convkit/adapter-meta

Meta (WhatsApp Cloud API) adapter for [Convkit](https://github.com/somaathetechster/Convkit).

Lets you test your existing Meta WhatsApp bot against Convkit without changing your bot code.

## How it works

```
Convkit UI
   ↓
ConvkitEvent (Convkit protocol)
   ↓
MetaAdapter (this package)
   ↓
Meta webhook format
   ↓
Your existing Meta bot
   ↓
Meta response format
   ↓
MetaAdapter
   ↓
Convkit reply format
   ↓
Convkit UI
```

## Install

```bash
npm install @convkit/adapter-meta
```

## Usage

```typescript
import { MetaAdapter } from '@convkit/adapter-meta'

const adapter = new MetaAdapter({
  convkitUrl: 'http://localhost:4000',
  botWebhookUrl: 'http://localhost:5000/webhook',
  port: 6001
})

adapter.listen()
```

Then in Convkit, set your webhook URL to `http://localhost:6001/webhook`.

Your bot receives standard Meta webhooks. The adapter handles the translation.

## What gets translated

Inbound — Convkit event to the `entry[].changes[].value.messages[]` envelope your bot
already parses:

| Convkit message | Meta message |
| --- | --- |
| `text` | `type: 'text'`, `text.body` |
| `button` | `type: 'interactive'`, `interactive.type: 'button_reply'` |
| `list` | `type: 'interactive'`, `interactive.type: 'list_reply'` |

Outbound — your bot's Cloud API send payload back into a Convkit reply:

| Meta payload | Convkit reply |
| --- | --- |
| `type: 'text'` | `text` |
| `interactive.type: 'button'` | `buttons` |
| `interactive.type: 'list'` | `list` |

Types the adapter does not recognise are skipped rather than forwarded, so an
unsupported message never reaches the Convkit UI as a broken reply.

## Notes on the Meta format

A few differences from other providers are worth knowing when you read the payloads:

- **Deep envelope.** Inbound messages are nested under
  `entry[0].changes[0].value.messages[0]`, not a flat `results[]` array. The `value` block
  also carries `metadata` and `contacts`, which the adapter fills with placeholder business
  details (`PHONE_NUMBER_ID`, `16505551111`) and the Convkit user's name and phone.
- **Unix-second timestamps.** Meta sends `timestamp` as a string of unix *seconds*, while the
  Convkit protocol uses an ISO 8601 string. The adapter converts between them.
- **Phone numbers carry no `+`.** `wa_id` and `from` are digits only, so the leading `+` on
  the Convkit user's phone is stripped.
- **Asymmetric shapes.** Inbound button and list taps arrive as `button_reply` / `list_reply`,
  whereas outbound interactive messages use `button` / `list`. The two directions are not
  mirror images.
- **One message per send.** Cloud API sends are a single message object rather than a batch.
  The adapter accepts a lone object, an array, or a `{ messages: [...] }` wrapper, so bots
  that batch their replies still work.

## Transformers

The two transform functions are exported on their own if you want to drive them directly,
for example from a test:

```typescript
import { convkitEventToMeta, metaResponseToConvkit } from '@convkit/adapter-meta'
```

## License

MIT
