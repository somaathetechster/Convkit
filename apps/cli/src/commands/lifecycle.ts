import type { ChildProcess } from 'child_process'

export async function waitForServerReady(
  serverUrl: string,
  options: { timeoutMs?: number; intervalMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const intervalMs = options.intervalMs ?? 100
  const fetchImpl = options.fetchImpl ?? fetch
  const startedAt = Date.now()
  let lastError = 'server did not respond'

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(`${serverUrl}/health`)
      if (response.ok) return
      lastError = `server returned HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Convkit server was not ready within ${timeoutMs}ms: ${lastError}`)
}

export async function registerAdapterBot(
  serverUrl: string,
  adapterEndpoint: string,
  adapterName: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const response = await fetchImpl(`${serverUrl}/api/v1/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${adapterName} bot`, webhookUrl: adapterEndpoint })
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Bot registration failed (HTTP ${response.status})${details ? `: ${details}` : ''}`)
  }
}

export function stopChildren(children: ChildProcess[]): void {
  for (const child of children) {
    if (!child.killed && child.exitCode === null) child.kill('SIGTERM')
  }
}
