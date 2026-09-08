# convkit

Python SDK for [Convkit](https://github.com/somaathetechster/Convkit) — a local development environment for WhatsApp bots.

## Install

```bash
pip install convkit
```

## Usage

```python
from convkit import ConvkitBot

bot = ConvkitBot(emulator_url="http://localhost:4000")

@bot.on("message")
async def handle_message(event):
    await bot.reply_text(event["sessionId"], "Hello! 👋")

@bot.on("button.clicked")
async def handle_button(event):
    await bot.reply_buttons(
        event["sessionId"],
        "Choose an option:",
        [{"id": "yes", "title": "Yes"}, {"id": "no", "title": "No"}]
    )

@bot.on("list.selected")
async def handle_list(event):
    item = event["message"]["itemTitle"]
    await bot.reply_text(event["sessionId"], f"You selected: {item}")

bot.listen(5000)
```

## Requirements

- Python 3.9+
- A running Convkit server (`convkit server` or `convkit dev`)
- No external dependencies — stdlib only

## API

### `ConvkitBot(emulator_url, webhook_path)`

- `emulator_url` — URL of the Convkit server (default: `http://localhost:4000`)
- `webhook_path` — webhook endpoint path (default: `/webhook`)

### `@bot.on(event_type)`

Register an event handler. Supported event types:
- `"message"` or `"message.received"`
- `"button.clicked"`
- `"list.selected"`

Handlers can be sync or async functions.

### `await bot.reply_text(session_id, text)`

Send a text message.

### `await bot.reply_buttons(session_id, text, buttons)`

Send a button message. `buttons` is a list of `{"id": str, "title": str}`.

### `await bot.reply_list(session_id, text, button_text, sections)`

Send a list message. `sections` is a list of `{"title": str, "items": [...]}`.

### `await bot.reply(session_id, message)`

Send a raw message dict.

### `bot.listen(port)`

Start the webhook server. Blocks until interrupted.

### `bot.close()`

Stop the server.

## Development

Run the test suite from `sdks/python/`:

```bash
python3 -m unittest discover tests/ -v
```

## License

MIT
