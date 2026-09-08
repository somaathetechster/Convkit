import asyncio
import json
import unittest
from unittest.mock import patch

from convkit import ConvkitBot

EMULATOR = "http://localhost:4000"
SEND_URL = f"{EMULATOR}/api/v1/bot/message"


def make_event(event_type="message.received", **overrides):
    event = {
        "version": "1.0",
        "event": event_type,
        "timestamp": "2026-09-08T10:00:00.000Z",
        "user": {"id": "user_1", "phone": "+2348012345678"},
        "message": {"type": "text", "text": "hello"},
        "sessionId": "session_1",
    }
    event.update(overrides)
    return event


class CapturedSend:
    """Collects the Request objects passed to urlopen, and decodes their bodies."""

    def __init__(self):
        self.requests = []

    def __call__(self, req, *args, **kwargs):
        self.requests.append(req)
        return None

    @property
    def payload(self):
        return json.loads(self.requests[0].data.decode("utf-8"))

    @property
    def url(self):
        return self.requests[0].full_url


class TestHandlerRegistration(unittest.TestCase):
    def test_on_decorator_registers_handler(self):
        bot = ConvkitBot(emulator_url=EMULATOR)

        @bot.on("message")
        def handler(event):
            pass

        self.assertIn("message.received", bot._handlers)
        self.assertIn(handler, bot._handlers["message.received"])

    def test_on_message_normalizes_to_message_received(self):
        bot = ConvkitBot(emulator_url=EMULATOR)

        @bot.on("message")
        def handler(event):
            pass

        self.assertIn("message.received", bot._handlers)
        self.assertNotIn("message", bot._handlers)

    def test_on_button_clicked(self):
        bot = ConvkitBot(emulator_url=EMULATOR)

        @bot.on("button.clicked")
        def handler(event):
            pass

        self.assertEqual(bot._handlers["button.clicked"], [handler])

    def test_multiple_handlers_same_event(self):
        bot = ConvkitBot(emulator_url=EMULATOR)

        @bot.on("message")
        def first(event):
            pass

        @bot.on("message")
        def second(event):
            pass

        self.assertEqual(bot._handlers["message.received"], [first, second])


class TestEventDispatch(unittest.TestCase):
    def test_handle_event_calls_sync_handler(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        received = []

        @bot.on("message")
        def handler(event):
            received.append(event)

        event = make_event()
        asyncio.run(bot._handle_event(event))

        self.assertEqual(received, [event])

    def test_handle_event_calls_async_handler(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        received = []

        @bot.on("message")
        async def handler(event):
            received.append(event)

        event = make_event()
        asyncio.run(bot._handle_event(event))

        self.assertEqual(received, [event])

    def test_handle_event_unknown_type_no_error(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        received = []

        @bot.on("message")
        def handler(event):
            received.append(event)

        # session.started has no registered handler; this must not raise
        asyncio.run(bot._handle_event(make_event("session.started")))

        self.assertEqual(received, [])


class TestReplies(unittest.TestCase):
    def test_reply_text_sends_correct_payload(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        captured = CapturedSend()

        with patch("convkit.bot.urlopen", captured):
            asyncio.run(bot.reply_text("session_1", "Hello"))

        self.assertEqual(len(captured.requests), 1)
        self.assertEqual(captured.url, SEND_URL)
        self.assertEqual(
            captured.payload,
            {"sessionId": "session_1", "message": {"type": "text", "text": "Hello"}},
        )

    def test_reply_buttons_sends_correct_payload(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        captured = CapturedSend()
        buttons = [{"id": "yes", "title": "Yes"}, {"id": "no", "title": "No"}]

        with patch("convkit.bot.urlopen", captured):
            asyncio.run(bot.reply_buttons("session_1", "Choose an option:", buttons))

        self.assertEqual(captured.url, SEND_URL)
        self.assertEqual(
            captured.payload,
            {
                "sessionId": "session_1",
                "message": {
                    "type": "buttons",
                    "text": "Choose an option:",
                    "buttons": buttons,
                },
            },
        )

    def test_reply_list_sends_correct_payload(self):
        bot = ConvkitBot(emulator_url=EMULATOR)
        captured = CapturedSend()
        sections = [
            {
                "title": "Section 1",
                "items": [
                    {"id": "row1", "title": "Item 1", "description": "Description"}
                ],
            }
        ]

        with patch("convkit.bot.urlopen", captured):
            asyncio.run(bot.reply_list("session_1", "Pick one:", "Select", sections))

        self.assertEqual(captured.url, SEND_URL)
        self.assertEqual(
            captured.payload,
            {
                "sessionId": "session_1",
                "message": {
                    "type": "list",
                    "text": "Pick one:",
                    "buttonText": "Select",
                    "sections": sections,
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
