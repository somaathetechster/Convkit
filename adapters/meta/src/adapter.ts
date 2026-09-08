import http from 'http'
import type { ConvkitEvent } from '@convkit/protocol'
import { convkitEventToMeta, metaResponseToConvkit } from './transformer.js'

export interface MetaAdapterConfig {
  convkitUrl: string
  botWebhookUrl: string
  port: number
}

export class MetaAdapter {
  private config: MetaAdapterConfig
  private server: http.Server | null = null

  constructor(config: MetaAdapterConfig) {
    this.config = config
  }

  // Handle a single ConvkitEvent: translate, forward to bot, translate response back
  async handle(event: ConvkitEvent): Promise<void> {
    const metaPayload = convkitEventToMeta(event)

    const response = await fetch(this.config.botWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaPayload)
    })

    if (!response.ok) {
      throw new Error(`Bot webhook responded with ${response.status}`)
    }

    const botResponse = await response.json()
    const replies = metaResponseToConvkit(botResponse)

    for (const reply of replies) {
      await fetch(`${this.config.convkitUrl}/api/v1/bot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: event.sessionId, message: reply })
      })
    }
  }

  // Start a webhook server that receives ConvkitEvents and processes them
  listen(): void {
    this.server = http.createServer(async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(404); res.end(); return
      }

      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const event: ConvkitEvent = JSON.parse(body)
          await this.handle(event)
        } catch (err) {
          console.error('[MetaAdapter] Error:', err)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
    })

    this.server.listen(this.config.port, () => {
      console.log(`[MetaAdapter] Listening on port ${this.config.port}`)
      console.log(`[MetaAdapter] Forwarding to bot at ${this.config.botWebhookUrl}`)
    })
  }

  close(): void {
    this.server?.close()
  }
}
