import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import http from 'http'
import { ConvkitBot } from './bot.js'
import type { ConvkitEvent } from '@convkit/protocol'

const EMULATOR = 'http://localhost:4000'

function makeEvent(overrides: Partial<ConvkitEvent> = {}): ConvkitEvent {
  return {
    version: '1.0',
    event: 'message.received',
    timestamp: new Date().toISOString(),
    user: { id: 'user_1', phone: '+15550000000' },
    message: { type: 'text', text: 'hello' },
    sessionId: 'session_1',
    ...overrides
  }
}

// A fake IncomingMessage we can push a body through, plus a stub response.
function fakeRequest(body: unknown, url = '/webhook', method = 'POST') {
  const req = Object.assign(new EventEmitter(), { url, method })
  const res = {
    writeHead: vi.fn(),
    end: vi.fn()
  }
  const flush = () => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  }
  return { req, res, flush }
}

// Capture the request listener that listen() hands to http.createServer,
// without ever binding a port.
function captureHandler(bot: ConvkitBot) {
  let handler: ((req: any, res: any) => void) | undefined
  const listen = vi.fn()
  const spy = vi.spyOn(http, 'createServer').mockImplementation(((fn: any) => {
    handler = fn
    return { listen, close: vi.fn() } as any
  }) as any)
  bot.listen(5000)
  spy.mockRestore()
  if (!handler) throw new Error('listen() did not register a request handler')
  return handler
}

// Drive one webhook request through the bot and wait for the response to be sent.
async function deliver(bot: ConvkitBot, body: unknown, url?: string, method?: string) {
  const handler = captureHandler(bot)
  const { req, res, flush } = fakeRequest(body, url, method)
  const done = new Promise<void>(resolve => {
    res.end.mockImplementation(() => resolve())
  })
  handler(req, res)
  flush()
  await done
  return res
}

describe('ConvkitBot', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('registers a message handler and calls it', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    const handler = vi.fn()
    bot.on('message', handler)

    const event = makeEvent()
    await deliver(bot, event)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('replyText sends correct payload to emulator', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    await bot.replyText('session_1', 'Hello')

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe(`${EMULATOR}/api/v1/bot/message`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({
      sessionId: 'session_1',
      message: { type: 'text', text: 'Hello' }
    })
  })

  it('replyButtons sends correct payload', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    await bot.replyButtons('session_1', 'Choose:', [{ id: 'a', title: 'A' }])

    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe(`${EMULATOR}/api/v1/bot/message`)
    expect(JSON.parse(init.body)).toEqual({
      sessionId: 'session_1',
      message: { type: 'buttons', text: 'Choose:', buttons: [{ id: 'a', title: 'A' }] }
    })
  })

  it('replyList sends correct payload', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    await bot.replyList('session_1', 'Pick:', 'Select', [
      { title: 'S1', items: [{ id: 'i1', title: 'Item 1' }] }
    ])

    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe(`${EMULATOR}/api/v1/bot/message`)
    expect(JSON.parse(init.body)).toEqual({
      sessionId: 'session_1',
      message: {
        type: 'list',
        text: 'Pick:',
        buttonText: 'Select',
        sections: [{ title: 'S1', items: [{ id: 'i1', title: 'Item 1' }] }]
      }
    })
  })

  it('on() is chainable', () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    expect(bot.on('message', () => {})).toBe(bot)
    expect(bot.on('message', () => {}).on('button.clicked', () => {})).toBe(bot)
  })

  it('unknown event type has no handlers', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    const handler = vi.fn()
    bot.on('message', handler)

    const res = await deliver(bot, makeEvent({ event: 'session.started' }))

    expect(handler).not.toHaveBeenCalled()
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }))
  })

  it('trims a trailing slash from emulatorUrl', async () => {
    const bot = new ConvkitBot({ emulatorUrl: `${EMULATOR}/` })
    await bot.replyText('session_1', 'Hello')
    expect((fetch as any).mock.calls[0][0]).toBe(`${EMULATOR}/api/v1/bot/message`)
  })

  it('ignores non-POST requests and requests to other paths', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    const handler = vi.fn()
    bot.on('message', handler)

    const wrongPath = await deliver(bot, makeEvent(), '/nope')
    expect(handler).not.toHaveBeenCalled()
    expect(wrongPath.writeHead).toHaveBeenCalledWith(404)

    const wrongMethod = await deliver(bot, makeEvent(), '/webhook', 'GET')
    expect(handler).not.toHaveBeenCalled()
    expect(wrongMethod.writeHead).toHaveBeenCalledWith(404)
  })

  it('routes button.clicked and list.selected to their handlers', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    const onButton = vi.fn()
    const onList = vi.fn()
    bot.on('button.clicked', onButton).on('list.selected', onList)

    await deliver(bot, makeEvent({ event: 'button.clicked' }))
    expect(onButton).toHaveBeenCalledTimes(1)
    expect(onList).not.toHaveBeenCalled()

    await deliver(bot, makeEvent({ event: 'list.selected' }))
    expect(onList).toHaveBeenCalledTimes(1)
  })

  it('honours a custom webhookPath', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR, webhookPath: '/hooks/convkit' })
    const handler = vi.fn()
    bot.on('message', handler)

    await deliver(bot, makeEvent(), '/hooks/convkit')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('still responds 200 when the body is not valid JSON', async () => {
    const bot = new ConvkitBot({ emulatorUrl: EMULATOR })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const handler = captureHandler(bot)
    const req = Object.assign(new EventEmitter(), { url: '/webhook', method: 'POST' })
    const res = { writeHead: vi.fn(), end: vi.fn() }
    const done = new Promise<void>(resolve => { res.end.mockImplementation(() => resolve()) })
    handler(req, res)
    req.emit('data', Buffer.from('not json'))
    req.emit('end')
    await done

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
    expect(errSpy).toHaveBeenCalled()
  })
})
