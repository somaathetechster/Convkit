import 'dotenv/config'
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { PROTOCOL_VERSION, ConvkitEvent, ButtonMessage, ListMessage } from '@convkit/protocol'
import type { RecordedMessage } from '@convkit/protocol'
import { createUser, getUsers, getUser, createSession, getSession, getSessionByUser, addMessage, resetSession, getSessions, updateUserMetadata } from './services/session.service.js'
import { startRecording, stopRecording, addMessageToRecording, isRecording, listRecordings, getRecording, deleteRecording } from './services/recording.service.js'
import { registerBot, getBots, getActiveBot } from './services/bot.service.js'
import { forwardToBot, getRequests } from './services/webhook.service.js'

const PORT = Number(process.env.PORT ?? 4000)
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'

const server = Fastify({ logger: false })
const connectedClients = new Set<any>()

await server.register(cors, {
  origin: WEB_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
await server.register(websocket)

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

server.get('/api/v1/network', async () => getRequests())

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
  if (isRecording(session.id) && sessionMsg) {
    addMessageToRecording(session.id, {
      id: sessionMsg.id,
      direction: 'inbound',
      message: sessionMsg.message,
      timestamp: sessionMsg.timestamp
    })
  }
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
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
  } catch (err: any) {
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
    broadcast('bot.error', { error: err.message })
    return { error: err.message }
  }
  return { ok: true }
})

server.post('/api/v1/bot/message', async (req) => {
  const { sessionId, message } = req.body as any
  const sessionMsg = addMessage(sessionId, 'outbound', message)
  if (isRecording(sessionId) && sessionMsg) {
    addMessageToRecording(sessionId, {
      id: sessionMsg.id,
      direction: 'outbound',
      message: sessionMsg.message,
      timestamp: sessionMsg.timestamp
    })
  }
  broadcast('message.received', { sessionId, message: sessionMsg })
  return { ok: true }
})

server.post('/api/v1/button', async (req) => {
  const { userId, buttonId, buttonTitle } = req.body as any
  const session = getSessionByUser(userId)
  if (!session) return { error: 'No session for user' }
  const bot = getActiveBot()
  if (!bot) return { error: 'No bot registered' }

  const message: ButtonMessage = { type: 'button', buttonId, buttonTitle }
  const sessionMsg = addMessage(session.id, 'inbound', message)
  if (isRecording(session.id) && sessionMsg) {
    addMessageToRecording(session.id, {
      id: sessionMsg.id,
      direction: 'inbound',
      message: sessionMsg.message,
      timestamp: sessionMsg.timestamp
    })
  }

  const event: ConvkitEvent = {
    version: PROTOCOL_VERSION,
    event: 'button.clicked',
    timestamp: new Date().toISOString(),
    user: session.user,
    message,
    sessionId: session.id
  }

  broadcast('message.sent', { sessionId: session.id, message: sessionMsg })

  try {
    await forwardToBot(bot.webhookUrl, event)
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
  } catch (err: any) {
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
    broadcast('bot.error', { error: err.message })
    return { error: err.message }
  }
  return { ok: true }
})

server.post('/api/v1/list', async (req) => {
  const { userId, itemId, itemTitle } = req.body as any
  const session = getSessionByUser(userId)
  if (!session) return { error: 'No session for user' }
  const bot = getActiveBot()
  if (!bot) return { error: 'No bot registered' }

  const message: ListMessage = { type: 'list', itemId, itemTitle }
  const sessionMsg = addMessage(session.id, 'inbound', message)
  if (isRecording(session.id) && sessionMsg) {
    addMessageToRecording(session.id, {
      id: sessionMsg.id,
      direction: 'inbound',
      message: sessionMsg.message,
      timestamp: sessionMsg.timestamp
    })
  }

  const event: ConvkitEvent = {
    version: PROTOCOL_VERSION,
    event: 'list.selected',
    timestamp: new Date().toISOString(),
    user: session.user,
    message,
    sessionId: session.id
  }

  broadcast('message.sent', { sessionId: session.id, message: sessionMsg })

  try {
    await forwardToBot(bot.webhookUrl, event)
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
  } catch (err: any) {
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
    broadcast('bot.error', { error: err.message })
    return { error: err.message }
  }
  return { ok: true }
})

server.patch('/api/v1/users/:id/metadata', async (req) => {
  const { id } = req.params as any
  const { metadata } = req.body as any
  const user = updateUserMetadata(id, (metadata ?? {}) as Record<string, unknown>)
  if (!user) return { error: 'User not found' }
  broadcast('user.updated', user)
  return user
})

server.delete('/api/v1/users/:id/metadata/:key', async (req) => {
  const { id, key } = req.params as any
  const user = getUser(id)
  if (!user) return { error: 'User not found' }
  if (user.metadata) delete user.metadata[key]
  broadcast('user.updated', user)
  return user
})

server.post('/api/v1/sessions/:id/record/start', async (req) => {
  const { id } = req.params as any
  const { name } = (req.body ?? {}) as any
  if (!name) return { error: 'Name is required' }
  const session = getSession(id)
  if (!session) return { error: 'Session not found' }
  if (isRecording(id)) return { error: 'Already recording' }
  startRecording(name, session.user, id)
  broadcast('recording.started', { sessionId: id, name })
  return { ok: true, sessionId: id, name }
})

server.post('/api/v1/sessions/:id/record/stop', async (req) => {
  const { id } = req.params as any
  const recording = stopRecording(id)
  if (!recording) return { error: 'Not recording' }
  broadcast('recording.stopped', recording)
  return recording
})

server.get('/api/v1/recordings', async () => listRecordings())

server.get('/api/v1/recordings/:id', async (req) => {
  const { id } = req.params as any
  return getRecording(id) ?? { error: 'Not found' }
})

server.delete('/api/v1/recordings/:id', async (req) => {
  const { id } = req.params as any
  return deleteRecording(id) ? { ok: true } : { error: 'Not found' }
})

server.post('/api/v1/recordings/:id/replay', async (req) => {
  const { id } = req.params as any
  const recording = getRecording(id)
  if (!recording) return { error: 'Not found' }
  const bot = getActiveBot()
  if (!bot) return { error: 'No bot registered' }
  const session = getSessionByUser(recording.user.id)
  if (!session) return { error: 'No session for this user. Create a user with the same phone number first.' }

  broadcast('replay.started', { recordingId: id, name: recording.name })

  try {
    const inbound = recording.messages.filter((m: RecordedMessage) => m.direction === 'inbound')
    for (const inboundMsg of inbound) {
      const message = inboundMsg.message as ConvkitEvent['message']
      const eventType =
        message.type === 'button' ? 'button.clicked'
        : message.type === 'list' ? 'list.selected'
        : 'message.received'

      const event: ConvkitEvent = {
        version: PROTOCOL_VERSION,
        event: eventType,
        timestamp: new Date().toISOString(),
        user: session.user,
        message,
        sessionId: session.id
      }

      const sessionMsg = addMessage(session.id, 'inbound', inboundMsg.message)
      if (sessionMsg) broadcast('message.sent', { sessionId: session.id, message: sessionMsg })

      await forwardToBot(bot.webhookUrl, event)
      const requests = getRequests()
      if (requests[0]) broadcast('network.request', requests[0])
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    broadcast('replay.completed', { recordingId: id })
    return { ok: true }
  } catch (err: any) {
    const requests = getRequests()
    if (requests[0]) broadcast('network.request', requests[0])
    broadcast('replay.error', { recordingId: id, error: err.message })
    return { error: err.message }
  }
})

try {
  await server.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Convkit server running on http://localhost:${PORT}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}