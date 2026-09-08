import http from 'http'
import type { ConvkitBotConfig, EventHandler } from './types.js'
import type { ConvkitEvent, ConvkitReply, EventType } from '@convkit/protocol'

export class ConvkitBot {
  private emulatorUrl: string
  private webhookPath: string
  private handlers: Map<string, EventHandler[]> = new Map()
  private server: http.Server | null = null

  constructor(config: ConvkitBotConfig) {
    this.emulatorUrl = config.emulatorUrl.replace(/\/$/, '')
    this.webhookPath = config.webhookPath ?? '/webhook'
  }

  on(eventType: EventType | 'message' | 'button.clicked' | 'list.selected', handler: EventHandler): this {
    const key = eventType === 'message' ? 'message.received' : eventType
    const existing = this.handlers.get(key) ?? []
    this.handlers.set(key, [...existing, handler])
    return this
  }

  async reply(sessionId: string, message: ConvkitReply): Promise<void> {
    await fetch(`${this.emulatorUrl}/api/v1/bot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    })
  }

  async replyText(sessionId: string, text: string): Promise<void> {
    await this.reply(sessionId, { type: 'text', text })
  }

  async replyButtons(
    sessionId: string,
    text: string,
    buttons: { id: string; title: string }[]
  ): Promise<void> {
    await this.reply(sessionId, { type: 'buttons', text, buttons })
  }

  async replyList(
    sessionId: string,
    text: string,
    buttonText: string,
    sections: { title: string; items: { id: string; title: string; description?: string }[] }[]
  ): Promise<void> {
    await this.reply(sessionId, { type: 'list', text, buttonText, sections })
  }

  listen(port: number): void {
    this.server = http.createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== this.webhookPath) {
        res.writeHead(404)
        res.end()
        return
      }

      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const event: ConvkitEvent = JSON.parse(body)
          const handlers = this.handlers.get(event.event) ?? []
          await Promise.all(handlers.map(h => h(event)))
        } catch (err) {
          console.error('[ConvkitBot] Error handling event:', err)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
    })

    this.server.listen(port, () => {
      console.log(`[ConvkitBot] Listening on http://localhost:${port}${this.webhookPath}`)
    })
  }

  close(): void {
    this.server?.close()
  }
}
