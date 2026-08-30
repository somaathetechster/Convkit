import json
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

CONVKIT_SERVER = "http://localhost:4000"
BOT_PORT = 5001


def reply(session_id: str, text: str):
    payload = json.dumps({
        "sessionId": session_id,
        "message": {"type": "text", "text": text}
    }).encode()

    req = urllib.request.Request(
        f"{CONVKIT_SERVER}/api/v1/bot/message",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    urllib.request.urlopen(req)


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
        message = event.get("message", {})
        text = message.get("text", "").lower().strip()
        event_type = event.get("event")

        print(f"[Bot] {event_type} → {text!r}")

        if event_type == "message.received":
            if text in ("hello", "hi"):
                reply(session_id, "Hello! 👋 This is the Convkit Python demo bot.")
                reply(session_id, "Try: balance, ping, or help")
            elif text == "ping":
                reply(session_id, "Pong! 🏓 (from Python)")
            elif text == "balance":
                reply(session_id, "Your balance is ₦50,000.00")
            elif text == "help":
                reply(session_id, "Commands:\n• hello\n• ping\n• balance")
            else:
                reply(session_id, f'You said: "{message.get("text")}". I don\'t understand that yet.')

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", BOT_PORT), WebhookHandler)
    print(f"Python bot running on http://localhost:{BOT_PORT}")
    print(f"Register it in Convkit at: http://localhost:{BOT_PORT}/webhook")
    server.serve_forever()