import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { PROTOCOL_VERSION, ConvkitEvent } from '@convkit/protocol'
import { createUser, getUsers, createSession, getSessionByUser, addMessage, resetSession, getSessions } from './services/session.service.js'
import { registerBot, getBots, getActiveBot } from './services/bot.service.js'
import { forwardToBot } from './services/webhook.service.js'
import 'dotenv/config'

const PORT = Number(process.env.PORT ?? 4000)
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const server = Fastify({ logger: false })
const connectedClients = new Set<any>()

await server.register(cors, { origin: WEB_URL })
// ...
await server.listen({ port: PORT, host: '0.0.0.0' })


function broadcast(event: string, data: unknown) {
  const payload = JSON.stringify({ event, data })
  for (const client of connectedClients) {
    if (client.readyState === 1) client.send(payload)
  }
}

server.get('/ws', { websocket: true }, (socket) => {
  connectedClients.add(socket)
  console.log(`[WS] Client connected (${connectedClients.size} total)`)
  socket.on('close', () => {
    connectedClients.delete(socket)
    console.log(`[WS] Client disconnected (${connectedClients.size} total)`)
  })
})

server.get('/health', async () => ({
  status: 'ok',
  version: '0.1.0',
  protocol: PROTOCOL_VERSION
}))

server.post('/api/v1/bots', async (req) => {
  const { name, webhookUrl } = req.body as any
  const bot = registerBot(name, webhookUrl)
  broadcast('bot.registered', bot)
  return bot
})

server.get('/api/v1/bots', async () => getBots())

server.post('/api/v1/users', async (req) => {
  const user = createUser(req.body as any)
  const session = createSession(user)
  broadcast('user.created', { user, session })
  return { user, session }
})

server.get('/api/v1/users', async () => getUsers())

server.get('/api/v1/sessions', async () => getSessions())

server.post('/api/v1/sessions/:id/reset', async (req) => {
  const { id } = req.params as any
  const session = resetSession(id)
  if (!session) return { error: 'Session not found' }
  broadcast('session.reset', session)
  return session
})

server.post('/api/v1/messages', async (req) => {
  const { userId, message } = req.body as any
  const session = getSessionByUser(userId)
  if (!session) return { error: 'No session for user' }
  const bot = getActiveBot()
  if (!bot) return { error: 'No bot registered' }
  const sessionMsg = addMessage(session.id, 'inbound', message)
  const event: ConvkitEvent = {
    version: PROTOCOL_VERSION,
    event: 'message.received',
    timestamp: new Date().toISOString(),
    user: session.user,
    message,
    sessionId: session.id
  }
  broadcast('message.sent', { sessionId: session.id, message: sessionMsg })
  try {
    await forwardToBot(bot.webhookUrl, event)
  } catch (err: any) {
    broadcast('bot.error', { error: err.message })
    return { error: err.message }
  }
  return { ok: true }
})

server.post('/api/v1/bot/message', async (req) => {
  const { sessionId, message } = req.body as any
  const sessionMsg = addMessage(sessionId, 'outbound', message)
  broadcast('message.received', { sessionId, message: sessionMsg })
  return { ok: true }
})

try {
  await server.listen({ port: 4000, host: '0.0.0.0' })
  console.log('Convkit server running on http://localhost:4000')
} catch (err) {
  console.error(err)
  process.exit(1)
}