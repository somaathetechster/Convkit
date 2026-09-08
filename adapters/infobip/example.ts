/**
 * Infobip Adapter Example
 *
 * This shows how to connect an existing Infobip bot to Convkit.
 *
 * Your bot code stays unchanged. The adapter runs alongside it
 * and translates between Convkit and Infobip formats.
 *
 * Architecture:
 *   Convkit (port 4000) → Adapter (port 6000) → Your Bot (port 5000)
 */

import { InfobipAdapter } from './src/index.js'

const adapter = new InfobipAdapter({
  convkitUrl: 'http://localhost:4000',
  botWebhookUrl: 'http://localhost:5000/webhook',
  port: 6000
})

adapter.listen()

// In Convkit UI:
// Set webhook URL to: http://localhost:6000/webhook
// Your bot receives standard Infobip webhooks
