import json
import os
import sys

# Add the SDK to the path when running from the monorepo
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'sdks', 'python'))

from convkit import ConvkitBot

CONVKIT_SERVER = "http://localhost:4000"
BOT_PORT = 5001

ABOUT_TEXT = (
    "This is the Convkit demo bot. It demonstrates text, buttons, lists, "
    "and state injection."
)

HELP_SECTIONS = [
    {
        "title": "Commands",
        "items": [
            {"id": "hello", "title": "hello", "description": "Start the conversation"},
            {"id": "ping", "title": "ping", "description": "Test the connection"},
            {"id": "status", "title": "status", "description": "Show the state injected into this user"},
        ],
    },
    {
        "title": "Info",
        "items": [
            {"id": "about", "title": "about", "description": "What this bot demonstrates"},
            {"id": "version", "title": "version", "description": "Demo bot version"},
        ],
    },
]

FEATURE_SECTIONS = [
    {
        "title": "Capabilities",
        "items": [
            {"id": "text", "title": "Text Messages", "description": "Plain text replies"},
            {"id": "buttons", "title": "Button Messages", "description": "Up to three tappable replies"},
            {"id": "list", "title": "List Messages", "description": "Grouped, described options"},
            {"id": "state", "title": "State Injection", "description": "User metadata delivered with every event"},
        ],
    }
]

bot = ConvkitBot(emulator_url=CONVKIT_SERVER)


async def send_help(session_id: str):
    await bot.reply_list(session_id, "Available commands:", "View commands", HELP_SECTIONS)


def format_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


async def send_status(session_id: str, user: dict):
    metadata = (user or {}).get("metadata") or {}
    if not metadata:
        await bot.reply_text(
            session_id,
            "No state set for this user. Try adding metadata in Convkit when creating a user.",
        )
        return
    lines = [f"• {key}: {format_value(value)}" for key, value in metadata.items()]
    await bot.reply_text(session_id, "User state:\n" + "\n".join(lines))


@bot.on("message")
async def handle_message(event):
    message = event.get("message") or {}
    session_id = event["sessionId"]
    text = (message.get("text") or "").lower().strip()

    if text in ("hello", "hi"):
        await bot.reply_text(session_id, "Hello! 👋 Welcome to the Convkit demo bot.")
        await bot.reply_buttons(session_id, "What would you like to do?", [
            {"id": "features", "title": "Features"},
            {"id": "about", "title": "About"},
            {"id": "help", "title": "Help"},
        ])
    elif text == "ping":
        await bot.reply_text(session_id, "Pong! 🏓")
    elif text == "help":
        await send_help(session_id)
    elif text == "status":
        await send_status(session_id, event.get("user") or {})
    elif text == "about":
        await bot.reply_text(session_id, ABOUT_TEXT)
    else:
        await bot.reply_text(session_id, "Unknown command. Send 'hello' to get started.")


@bot.on("button.clicked")
async def handle_button(event):
    message = event.get("message") or {}
    session_id = event["sessionId"]
    button_id = message.get("buttonId")

    if button_id == "features":
        await bot.reply_list(
            session_id, "Convkit supports these message types:", "View features", FEATURE_SECTIONS
        )
    elif button_id == "about":
        await bot.reply_text(session_id, ABOUT_TEXT)
    elif button_id == "help":
        await send_help(session_id)


@bot.on("list.selected")
async def handle_list(event):
    message = event.get("message") or {}
    session_id = event["sessionId"]
    item_title = message.get("itemTitle")
    await bot.reply_text(
        session_id,
        f"You selected: {item_title}. This is how list selections work in Convkit.",
    )


if __name__ == "__main__":
    print(f"Python bot running on http://localhost:{BOT_PORT}")
    print(f"Register it in Convkit at: http://localhost:{BOT_PORT}/webhook")
    bot.listen(BOT_PORT)
