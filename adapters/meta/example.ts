/**
 * Meta (WhatsApp Cloud API) Adapter Example
 *
 * This shows how to connect an existing Meta bot to Convkit.
 *
 * Your bot code stays unchanged. The adapter runs alongside it
 * and translates between Convkit and Meta formats.
 *
 * Architecture:
 *   Convkit (port 4000) → Adapter (port 6001) → Your Bot (port 5000)
 */

import { MetaAdapter } from './src/index.js'

const adapter = new MetaAdapter({
  convkitUrl: 'http://localhost:4000',
  botWebhookUrl: 'http://localhost:5000/webhook',
  port: 6001
})

adapter.listen()

// In Convkit UI:
// Set webhook URL to: http://localhost:6001/webhook
// Your bot receives standard Meta webhooks
