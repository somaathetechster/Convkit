import { ConvkitBot } from '@convkit/sdk'

const BOT_PORT = 5000

const bot = new ConvkitBot({ emulatorUrl: 'http://localhost:4000' })

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
  await bot.replyList(sessionId, 'Available commands:', 'View commands', HELP_SECTIONS)
}

async function sendStatus(sessionId, user) {
  const metadata = user?.metadata ?? {}
  const entries = Object.entries(metadata)

  if (entries.length === 0) {
    await bot.replyText(
      sessionId,
      'No state set for this user. Try adding metadata in Convkit when creating a user.'
    )
    return
  }

  const lines = entries.map(([key, value]) => `• ${key}: ${formatValue(value)}`)
  await bot.replyText(sessionId, `User state:\n${lines.join('\n')}`)
}

function formatValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

bot.on('message', async ({ sessionId, message, user }) => {
  console.log('[Bot] message.received →', JSON.stringify(message))

  const text = message?.text?.toLowerCase().trim() ?? ''

  if (text === 'hello' || text === 'hi') {
    await bot.replyText(sessionId, 'Hello! 👋 Welcome to the Convkit demo bot.')
    await bot.replyButtons(sessionId, 'What would you like to do?', [
      { id: 'features', title: 'Features' },
      { id: 'about', title: 'About' },
      { id: 'help', title: 'Help' }
    ])
  } else if (text === 'ping') {
    await bot.replyText(sessionId, 'Pong! 🏓')
  } else if (text === 'help') {
    await sendHelp(sessionId)
  } else if (text === 'status') {
    await sendStatus(sessionId, user)
  } else if (text === 'about') {
    await bot.replyText(sessionId, ABOUT_TEXT)
  } else {
    await bot.replyText(sessionId, "Unknown command. Send 'hello' to get started.")
  }
})

bot.on('button.clicked', async ({ sessionId, message }) => {
  console.log('[Bot] button.clicked →', JSON.stringify(message))

  const { buttonId } = message

  if (buttonId === 'features') {
    await bot.replyList(sessionId, 'Convkit supports these message types:', 'View features', FEATURE_SECTIONS)
  } else if (buttonId === 'about') {
    await bot.replyText(sessionId, ABOUT_TEXT)
  } else if (buttonId === 'help') {
    await sendHelp(sessionId)
  }
})

bot.on('list.selected', async ({ sessionId, message }) => {
  console.log('[Bot] list.selected →', JSON.stringify(message))

  const { itemTitle } = message
  await bot.replyText(sessionId, `You selected: ${itemTitle}. This is how list selections work in Convkit.`)
})

bot.listen(BOT_PORT)
console.log(`Register in Convkit at: http://localhost:${BOT_PORT}/webhook`)
