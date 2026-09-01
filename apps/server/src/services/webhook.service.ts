import { ConvkitEvent } from '@convkit/protocol'

export interface NetworkRequest {
  id: string
  timestamp: string
  method: string
  url: string
  requestBody: unknown
  responseBody: unknown
  status: number
  duration: number
  error?: string
}

const requests: NetworkRequest[] = []

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function getRequests(): NetworkRequest[] {
  return requests.slice().reverse()
}

export async function forwardToBot(webhookUrl: string, event: ConvkitEvent): Promise<unknown> {
  const id = generateId()
  const timestamp = new Date().toISOString()
  const start = Date.now()

  const record: NetworkRequest = {
    id,
    timestamp,
    method: 'POST',
    url: webhookUrl,
    requestBody: event,
    responseBody: null,
    status: 0,
    duration: 0
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    })

    const duration = Date.now() - start
    let responseBody: unknown = null

    try {
      responseBody = await response.json()
    } catch {
      responseBody = null
    }

    record.status = response.status
    record.duration = duration
    record.responseBody = responseBody

    requests.unshift(record)
    if (requests.length > 100) requests.pop()

    if (!response.ok) {
      throw new Error(`Bot webhook responded with ${response.status}`)
    }

    return responseBody
  } catch (err: any) {
    record.duration = Date.now() - start
    record.error = err.message
    record.status = 0

    requests.unshift(record)
    if (requests.length > 100) requests.pop()

    throw err
  }
}