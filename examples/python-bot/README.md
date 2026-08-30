# Convkit Python Bot Example

A minimal WhatsApp bot written in Python that connects to Convkit.

No external dependencies required — uses Python stdlib only.

## Run

```bash
python3 main.py
```

Then in the Convkit UI:
1. Set the webhook URL to `http://localhost:5001/webhook`
2. Click **Register bot**
3. Send a message

## Commands

- `hello` / `hi` — greeting
- `ping` — pong
- `balance` — returns a balance
- `help` — lists commands