import { ConvkitEvent } from '@convkit/protocol'

export async function forwardToBot(webhookUrl: string, event: ConvkitEvent): Promise<unknown> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  })
  if (!response.ok) {
    throw new Error(`Bot webhook responded with ${response.status}`)
  }
  return response.json()
}