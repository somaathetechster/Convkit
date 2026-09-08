import asyncio
import json
import logging
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from typing import Any, Callable, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)


class ConvkitBot:
    """
    Convkit Python SDK.

    Connect your Python WhatsApp bot to the Convkit local development environment.

    Usage:
        bot = ConvkitBot(emulator_url="http://localhost:4000")

        @bot.on("message")
        async def handle_message(event):
            await bot.reply_text(event["sessionId"], "Hello!")

        bot.listen(5000)
    """

    def __init__(
        self,
        emulator_url: str = "http://localhost:4000",
        webhook_path: str = "/webhook",
    ):
        self.emulator_url = emulator_url.rstrip("/")
        self.webhook_path = webhook_path
        self._handlers: Dict[str, List[Callable]] = {}
        self._server: Optional[HTTPServer] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def on(self, event_type: str) -> Callable:
        """
        Register a handler for a Convkit event type.

        Supported event types:
          - "message" or "message.received"
          - "button.clicked"
          - "list.selected"

        The handler can be sync or async.

        Usage:
            @bot.on("message")
            async def handle(event):
                await bot.reply_text(event["sessionId"], "Hello!")
        """
        # Normalize "message" to "message.received"
        key = "message.received" if event_type == "message" else event_type

        def decorator(fn: Callable) -> Callable:
            if key not in self._handlers:
                self._handlers[key] = []
            self._handlers[key].append(fn)
            return fn

        return decorator

    async def _send(self, payload: Dict[str, Any]) -> None:
        """Send a message back to Convkit."""
        data = json.dumps(payload).encode("utf-8")
        req = Request(
            f"{self.emulator_url}/api/v1/bot/message",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, urlopen, req)
        except URLError as e:
            logger.error(f"[ConvkitBot] Failed to send message: {e}")

    async def reply(self, session_id: str, message: Dict[str, Any]) -> None:
        """Send a raw Convkit reply message."""
        await self._send({"sessionId": session_id, "message": message})

    async def reply_text(self, session_id: str, text: str) -> None:
        """Send a text message."""
        await self.reply(session_id, {"type": "text", "text": text})

    async def reply_buttons(
        self,
        session_id: str,
        text: str,
        buttons: List[Dict[str, str]],
    ) -> None:
        """Send a button message."""
        await self.reply(session_id, {
            "type": "buttons",
            "text": text,
            "buttons": buttons,
        })

    async def reply_list(
        self,
        session_id: str,
        text: str,
        button_text: str,
        sections: List[Dict[str, Any]],
    ) -> None:
        """Send a list message."""
        await self.reply(session_id, {
            "type": "list",
            "text": text,
            "buttonText": button_text,
            "sections": sections,
        })

    async def _handle_event(self, event: Dict[str, Any]) -> None:
        """Route an incoming event to registered handlers."""
        event_type = event.get("event", "")
        handlers = self._handlers.get(event_type, [])

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"[ConvkitBot] Handler error for {event_type}: {e}")

    def _make_handler(self) -> type:
        """Create an HTTP request handler class bound to this bot instance."""
        bot = self

        class WebhookHandler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: Any) -> None:
                # Suppress default access logging; use our logger instead
                pass

            def do_POST(self) -> None:
                if self.path != bot.webhook_path:
                    self.send_response(404)
                    self.end_headers()
                    return

                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)

                try:
                    event = json.loads(body)
                except json.JSONDecodeError:
                    self.send_response(400)
                    self.end_headers()
                    return

                # Run async handler in the bot's event loop
                if bot._loop and bot._loop.is_running():
                    future = asyncio.run_coroutine_threadsafe(
                        bot._handle_event(event), bot._loop
                    )
                    future.result(timeout=10)
                else:
                    asyncio.run(bot._handle_event(event))

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok": true}')

            def do_GET(self) -> None:
                self.send_response(404)
                self.end_headers()

        return WebhookHandler

    def listen(self, port: int = 5000) -> None:
        """
        Start the webhook server and block until interrupted.

        This method blocks. Run it as the last line of your bot script.
        """
        # Create an event loop for async handlers
        self._loop = asyncio.new_event_loop()
        loop_thread = Thread(target=self._loop.run_forever, daemon=True)
        loop_thread.start()

        handler_class = self._make_handler()
        self._server = HTTPServer(("0.0.0.0", port), handler_class)

        print(f"[ConvkitBot] Listening on http://localhost:{port}{self.webhook_path}")
        print(f"[ConvkitBot] Forwarding to Convkit at {self.emulator_url}")

        try:
            self._server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            self.close()

    def close(self) -> None:
        """Stop the webhook server."""
        if self._server:
            self._server.shutdown()
            # Release the listening socket so the port is free immediately
            self._server.server_close()
            self._server = None
        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)
            self._loop = None
