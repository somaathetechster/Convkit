import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'

const server = Fastify({ logger: true })

await server.register(cors, { origin: 'http://localhost:3000' })
await server.register(websocket)

server.get('/health', async () => {
  return { status: 'ok', version: '0.1.0' }
})

server.get('/ws', { websocket: true }, (socket) => {
  console.log('Client connected')
  socket.on('message', (message) => {
    console.log('Received:', message.toString())
  })
  socket.on('close', () => {
    console.log('Client disconnected')
  })
})

try {
  await server.listen({ port: 4000, host: '0.0.0.0' })
  console.log('Convkit server running on http://localhost:4000')
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
