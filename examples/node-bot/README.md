# Convkit Node.js Bot Example

A minimal WhatsApp bot written in Node.js that connects to Convkit.

No external dependencies — uses Node.js stdlib only.

## Requirements

- Node.js 18+
- Convkit running on `http://localhost:4000`

## Run

```bash
node index.mjs
```

The bot starts on `http://localhost:5000`.

## Connect to Convkit

1. Open Convkit at `http://localhost:3000`
2. Set the webhook URL to `http://localhost:5000/webhook`
3. Click **Register bot**
4. Create a virtual user
5. Send a message

## Commands

| Command | Response |
|---|---|
| `hello` / `hi` | Greeting + available commands |
| `ping` | Pong |
| `balance` | Returns a demo balance |
| `help` | Lists available commands |

Any other message returns an echo with an "I don't understand" response.

## How it works

Convkit sends a POST request to `/webhook` every time the virtual user
sends a message. The bot reads the event, decides on a response, and
POSTs back to `http://localhost:4000/api/v1/bot/message`.