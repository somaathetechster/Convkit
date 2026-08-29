import http from 'http'

const CONVKIT_SERVER = 'http://localhost:4000'
const BOT_PORT = 5000

// Send a message back to Convkit
async function reply(sessionId, text) {
  await fetch(`${CONVKIT_SERVER}/api/v1/bot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: { type: 'text', text }
    })
  })
}

// Handle incoming messages from Convkit
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
    console.log('[Bot] Received:', event.event, '→', event.message?.text)

    const { sessionId, message } = event

    if (event.event === 'message.received') {
      const text = message?.text?.toLowerCase() ?? ''

      if (text === 'hello' || text === 'hi') {
        await reply(sessionId, 'Hello! 👋 Welcome to the Convkit demo bot.')
        await reply(sessionId, 'Try sending: balance, help, or ping')
      } else if (text === 'ping') {
        await reply(sessionId, 'Pong! 🏓')
      } else if (text === 'balance') {
        await reply(sessionId, 'Your balance is ₦50,000.00')
      } else if (text === 'help') {
        await reply(sessionId, 'Available commands:\n• hello\n• ping\n• balance')
      } else {
        await reply(sessionId, `You said: "${message.text}". I don't understand that yet.`)
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
})

server.listen(BOT_PORT, () => {
  console.log(`Demo bot running on http://localhost:${BOT_PORT}`)
  console.log('Register it in Convkit at: http://localhost:5000/webhook')
})