import http from 'http'

const CONVKIT_SERVER = 'http://localhost:4000'
const BOT_PORT = 5000

async function send(sessionId, message) {
  await fetch(`${CONVKIT_SERVER}/api/v1/bot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message })
  })
}

async function sendText(sessionId, text) {
  await send(sessionId, { type: 'text', text })
}

async function sendButtons(sessionId, text, buttons) {
  await send(sessionId, { type: 'buttons', text, buttons })
}

async function sendList(sessionId, text, buttonText, sections) {
  await send(sessionId, { type: 'list', text, buttonText, sections })
}

const HELP_SECTIONS = [
  {
    title: 'Commands',
    items: [
      { id: 'hello', title: 'hello', description: 'Start the conversation' },
      { id: 'ping', title: 'ping', description: 'Test the connection' },
      { id: 'status', title: 'status', description: 'Show the state injected into this user' }
    ]
  },
  {
    title: 'Info',
    items: [
      { id: 'about', title: 'about', description: 'What this bot demonstrates' },
      { id: 'version', title: 'version', description: 'Demo bot version' }
    ]
  }
]

const FEATURE_SECTIONS = [
  {
    title: 'Capabilities',
    items: [
      { id: 'text', title: 'Text Messages', description: 'Plain text replies' },
      { id: 'buttons', title: 'Button Messages', description: 'Up to three tappable replies' },
      { id: 'list', title: 'List Messages', description: 'Grouped, described options' },
      { id: 'state', title: 'State Injection', description: 'User metadata delivered with every event' }
    ]
  }
]

const ABOUT_TEXT =
  'This is the Convkit demo bot. It demonstrates text, buttons, lists, and state injection.'

async function sendHelp(sessionId) {
  await sendList(sessionId, 'Available commands:', 'View commands', HELP_SECTIONS)
}

async function sendStatus(sessionId, user) {
  const metadata = user?.metadata ?? {}
  const entries = Object.entries(metadata)

  if (entries.length === 0) {
    await sendText(
      sessionId,
      'No state set for this user. Try adding metadata in Convkit when creating a user.'
    )
    return
  }

  const lines = entries.map(([key, value]) => `• ${key}: ${formatValue(value)}`)
  await sendText(sessionId, `User state:\n${lines.join('\n')}`)
}

function formatValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(404)
    res.end()
    return
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    const event = JSON.parse(body)
    const { sessionId, message, user, event: eventType } = event

    console.log(`[Bot] ${eventType} →`, JSON.stringify(message))

    if (eventType === 'message.received') {
      const text = message?.text?.toLowerCase().trim() ?? ''

      if (text === 'hello' || text === 'hi') {
        await sendText(sessionId, 'Hello! 👋 Welcome to the Convkit demo bot.')
        await sendButtons(sessionId, 'What would you like to do?', [
          { id: 'features', title: 'Features' },
          { id: 'about', title: 'About' },
          { id: 'help', title: 'Help' }
        ])
      } else if (text === 'ping') {
        await sendText(sessionId, 'Pong! 🏓')
      } else if (text === 'help') {
        await sendHelp(sessionId)
      } else if (text === 'status') {
        await sendStatus(sessionId, user)
      } else if (text === 'about') {
        await sendText(sessionId, ABOUT_TEXT)
      } else {
        await sendText(sessionId, "Unknown command. Send 'hello' to get started.")
      }
    }

    if (eventType === 'button.clicked') {
      const { buttonId } = message

      if (buttonId === 'features') {
        await sendList(sessionId, 'Convkit supports these message types:', 'View features', FEATURE_SECTIONS)
      } else if (buttonId === 'about') {
        await sendText(sessionId, ABOUT_TEXT)
      } else if (buttonId === 'help') {
        await sendHelp(sessionId)
      }
    }

    if (eventType === 'list.selected') {
      const { itemTitle } = message
      await sendText(sessionId, `You selected: ${itemTitle}. This is how list selections work in Convkit.`)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
})

server.listen(BOT_PORT, () => {
  console.log(`Demo bot running on http://localhost:${BOT_PORT}`)
  console.log(`Register in Convkit at: http://localhost:${BOT_PORT}/webhook`)
})
