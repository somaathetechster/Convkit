import { describe, expect, it, vi } from 'vitest'
import { registerAdapterBot, stopChildren, waitForServerReady } from './lifecycle.js'

describe('CLI startup lifecycle', () => {
  it('waits until the health endpoint is ready', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('not listening'))
      .mockResolvedValueOnce(new Response('', { status: 200 }))

    await waitForServerReady('http://localhost:4000', { fetchImpl, intervalMs: 0, timeoutMs: 100 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('registers the adapter endpoint using the existing bot API schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 200 }))

    await registerAdapterBot('http://localhost:4000', 'http://localhost:6000/webhook', 'infobip', fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:4000/api/v1/bots', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'infobip bot', webhookUrl: 'http://localhost:6000/webhook' })
    }))
  })

  it('reports registration failures', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('invalid body', { status: 500 }))
    await expect(registerAdapterBot('http://localhost:4000', 'http://localhost:6000/webhook', 'meta', fetchImpl))
      .rejects.toThrow('Bot registration failed (HTTP 500)')
  })

  it('stops live child processes during cleanup', () => {
    const child = { killed: false, exitCode: null, kill: vi.fn() }
    stopChildren([child as any])
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })
})
