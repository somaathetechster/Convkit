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
    const { sessionId, message, event: eventType } = event

    console.log(`[Bot] ${eventType} →`, JSON.stringify(message))

    if (eventType === 'message.received') {
      const text = message?.text?.toLowerCase().trim() ?? ''

      if (text === 'hello' || text === 'hi') {
        await sendText(sessionId, 'Hello! 👋 Welcome to the Convkit demo bot.')
        await sendButtons(sessionId, 'What would you like to do?', [
          { id: 'buy', title: '💰 Buy' },
          { id: 'sell', title: '📤 Sell' },
          { id: 'balance', title: '💳 Balance' }
        ])
      } else if (text === 'ping') {
        await sendText(sessionId, 'Pong! 🏓')
      } else if (text === 'balance') {
        await sendText(sessionId, '💳 Your balance is ₦50,000.00')
      } else if (text === 'help') {
        await sendList(sessionId, 'Available commands:', 'View commands', [
          {
            title: 'General',
            items: [
              { id: 'hello', title: 'hello', description: 'Start the conversation' },
              { id: 'ping', title: 'ping', description: 'Test the connection' },
            ]
          },
          {
            title: 'Account',
            items: [
              { id: 'balance', title: 'balance', description: 'Check your balance' },
              { id: 'buy', title: 'buy', description: 'Buy an asset' },
              { id: 'sell', title: 'sell', description: 'Sell an asset' },
            ]
          }
        ])
      } else {
        await sendText(sessionId, `You said: "${message.text}". Try sending hello or help.`)
      }
    }

    if (eventType === 'button.clicked') {
      const { buttonId } = message

      if (buttonId === 'buy') {
        await sendText(sessionId, 'You selected Buy.')
        await sendList(sessionId, 'What would you like to buy?', 'Select asset', [
          {
            title: 'Crypto',
            items: [
              { id: 'usdt', title: 'USDT', description: 'Tether USD' },
              { id: 'btc', title: 'BTC', description: 'Bitcoin' },
              { id: 'eth', title: 'ETH', description: 'Ethereum' },
            ]
          }
        ])
      } else if (buttonId === 'sell') {
        await sendText(sessionId, 'You selected Sell.')
        await sendButtons(sessionId, 'Select asset to sell:', [
          { id: 'sell_usdt', title: 'USDT' },
          { id: 'sell_btc', title: 'BTC' },
        ])
      } else if (buttonId === 'balance') {
        await sendText(sessionId, '💳 Your balance is ₦50,000.00')
      }
    }

    if (eventType === 'list.selected') {
      const { itemId, itemTitle } = message
      await sendText(sessionId, `You selected: ${itemTitle}`)
      await sendText(sessionId, `Processing ${itemTitle} transaction... ✅`)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
})

server.listen(BOT_PORT, () => {
  console.log(`Demo bot running on http://localhost:${BOT_PORT}`)
  console.log(`Register in Convkit at: http://localhost:${BOT_PORT}/webhook`)
})