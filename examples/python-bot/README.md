# Convkit Python Bot Example

A generic demo bot written in Python that connects to Convkit. It is
industry-neutral — it exists to demonstrate what Convkit can do, not to model
any particular product. It mirrors the Node.js example exactly.

It exercises every message type Convkit supports: text, buttons, lists, and
state injection.

No external dependencies — uses Python stdlib only.

## Requirements

- Python 3.9+
- Convkit running on `http://localhost:4000`

## Run

```bash
python3 main.py
```

The bot starts on `http://localhost:5001`.

## Connect to Convkit

1. Open Convkit at `http://localhost:3000`
2. Set the webhook URL to `http://localhost:5001/webhook`
3. Click **Register bot**
4. Create a virtual user
5. Send a message

## Commands

| Command | Response |
|---|---|
| `hello` / `hi` | Greeting + buttons: Features, About, Help |
| `ping` | `Pong! 🏓` |
| `help` | A list message with two sections: Commands and Info |
| `status` | Formatted summary of the user's injected state (metadata) |
| `about` | What this bot demonstrates |

Any other message returns `Unknown command. Send 'hello' to get started.`

### Buttons

- **Features** — sends a list of Convkit's message capabilities
- **About** — same as the `about` command
- **Help** — same as the `help` command

### List selections

Selecting any list item replies with the item title and a short explanation of
how list selections are delivered.

## State injection

Every event Convkit forwards to the bot includes the full user object, and
`user["metadata"]` carries whatever state you injected into that user.

The `status` command reads that metadata and prints whatever keys are present.
If none are set, it replies:

> No state set for this user. Try adding metadata in Convkit when creating a user.

To try it:

1. In Convkit, click **+ New** to create a user
2. Under **State / Metadata**, click **+ Add field** and add keys such as
   `plan: pro` or `locale: en`
3. Create the user and send `status`

You can also add or remove keys on the fly from the **User State** panel below
the session ID, without recreating the user.

## How it works

Convkit sends a POST request to `/webhook` every time the virtual user acts.
The bot reads the event, decides on a response, and POSTs back to
`http://localhost:4000/api/v1/bot/message`.
