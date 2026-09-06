import json
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

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


def send(session_id: str, message: dict):
    payload = json.dumps({"sessionId": session_id, "message": message}).encode()
    req = urllib.request.Request(
        f"{CONVKIT_SERVER}/api/v1/bot/message",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req)


def send_text(session_id: str, text: str):
    send(session_id, {"type": "text", "text": text})


def send_buttons(session_id: str, text: str, buttons: list):
    send(session_id, {"type": "buttons", "text": text, "buttons": buttons})


def send_list(session_id: str, text: str, button_text: str, sections: list):
    send(session_id, {"type": "list", "text": text, "buttonText": button_text, "sections": sections})


def send_help(session_id: str):
    send_list(session_id, "Available commands:", "View commands", HELP_SECTIONS)


def format_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def send_status(session_id: str, user: dict):
    metadata = (user or {}).get("metadata") or {}
    if not metadata:
        send_text(
            session_id,
            "No state set for this user. Try adding metadata in Convkit when creating a user.",
        )
        return
    lines = [f"• {key}: {format_value(value)}" for key, value in metadata.items()]
    send_text(session_id, "User state:\n" + "\n".join(lines))


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[Bot] {format % args}")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            event = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        session_id = event.get("sessionId")
        message = event.get("message") or {}
        user = event.get("user") or {}
        event_type = event.get("event")

        print(f"[Bot] {event_type} → {message!r}")

        if event_type == "message.received":
            text = (message.get("text") or "").lower().strip()

            if text in ("hello", "hi"):
                send_text(session_id, "Hello! 👋 Welcome to the Convkit demo bot.")
                send_buttons(session_id, "What would you like to do?", [
                    {"id": "features", "title": "Features"},
                    {"id": "about", "title": "About"},
                    {"id": "help", "title": "Help"},
                ])
            elif text == "ping":
                send_text(session_id, "Pong! 🏓")
            elif text == "help":
                send_help(session_id)
            elif text == "status":
                send_status(session_id, user)
            elif text == "about":
                send_text(session_id, ABOUT_TEXT)
            else:
                send_text(session_id, "Unknown command. Send 'hello' to get started.")

        elif event_type == "button.clicked":
            button_id = message.get("buttonId")

            if button_id == "features":
                send_list(session_id, "Convkit supports these message types:", "View features", FEATURE_SECTIONS)
            elif button_id == "about":
                send_text(session_id, ABOUT_TEXT)
            elif button_id == "help":
                send_help(session_id)

        elif event_type == "list.selected":
            item_title = message.get("itemTitle")
            send_text(
                session_id,
                f"You selected: {item_title}. This is how list selections work in Convkit.",
            )

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", BOT_PORT), WebhookHandler)
    print(f"Python bot running on http://localhost:{BOT_PORT}")
    print(f"Register it in Convkit at: http://localhost:{BOT_PORT}/webhook")
    server.serve_forever()
