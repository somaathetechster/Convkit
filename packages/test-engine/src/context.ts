import type { TestConfig, ReceivedMessage, StepResult } from './types.js'

export class TestContext {
  private serverUrl: string
  private userId: string
  private sessionId: string
  private timeoutMs: number
  private stepDelayMs: number
  public steps: StepResult[] = []
  private lastOutboundMessages: ReceivedMessage[] = []

  constructor(config: TestConfig, userId: string, sessionId: string) {
    this.serverUrl = config.serverUrl
    this.userId = userId
    this.sessionId = sessionId
    this.timeoutMs = config.timeoutMs ?? 5000
    this.stepDelayMs = config.stepDelayMs ?? 300
  }

  // Wait for bot to respond after sending a message
  // Polls the session messages endpoint until new outbound messages appear
  private async waitForResponse(previousMessageCount: number): Promise<ReceivedMessage[]> {
    const start = Date.now()
    while (Date.now() - start < this.timeoutMs) {
      await sleep(200)
      const res = await fetch(`${this.serverUrl}/api/v1/sessions/${this.sessionId}/messages`)
      if (!res.ok) continue
      const messages: ReceivedMessage[] = await res.json()
      const outbound = messages.filter(m => m.direction === 'outbound')
      if (outbound.length > previousMessageCount) {
        // Wait a bit more in case bot sends multiple messages
        await sleep(this.stepDelayMs)
        const res2 = await fetch(`${this.serverUrl}/api/v1/sessions/${this.sessionId}/messages`)
        const messages2: ReceivedMessage[] = await res2.json()
        return messages2.filter(m => m.direction === 'outbound').slice(previousMessageCount)
      }
    }
    throw new Error(`Timeout: bot did not respond within ${this.timeoutMs}ms`)
  }

  private async getCurrentOutboundCount(): Promise<number> {
    const res = await fetch(`${this.serverUrl}/api/v1/sessions/${this.sessionId}/messages`)
    if (!res.ok) return 0
    const messages: ReceivedMessage[] = await res.json()
    return messages.filter(m => m.direction === 'outbound').length
  }

  private async runStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      this.steps.push({ step: label, passed: true, duration: Date.now() - start })
      return result
    } catch (err: any) {
      this.steps.push({ step: label, passed: false, error: err.message, duration: Date.now() - start })
      throw err
    }
  }

  async send(text: string): Promise<ReceivedMessage[]> {
    return this.runStep(`send("${text}")`, async () => {
      const count = await this.getCurrentOutboundCount()
      await fetch(`${this.serverUrl}/api/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, message: { type: 'text', text } })
      })
      const responses = await this.waitForResponse(count)
      this.lastOutboundMessages = responses
      return responses
    })
  }

  async click(buttonTitle: string): Promise<ReceivedMessage[]> {
    return this.runStep(`click("${buttonTitle}")`, async () => {
      // Find the button in the last outbound messages
      let buttonId: string | undefined
      for (const msg of this.lastOutboundMessages) {
        if (msg.message.type === 'buttons') {
          const btn = msg.message.buttons?.find(b => b.title === buttonTitle)
          if (btn) { buttonId = btn.id; break }
        }
      }
      if (!buttonId) throw new Error(`Button "${buttonTitle}" not found in last bot response`)

      const count = await this.getCurrentOutboundCount()
      await fetch(`${this.serverUrl}/api/v1/button`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, buttonId, buttonTitle })
      })
      const responses = await this.waitForResponse(count)
      this.lastOutboundMessages = responses
      return responses
    })
  }

  async select(itemTitle: string): Promise<ReceivedMessage[]> {
    return this.runStep(`select("${itemTitle}")`, async () => {
      // Find the item in the last outbound messages
      let itemId: string | undefined
      for (const msg of this.lastOutboundMessages) {
        if (msg.message.type === 'list') {
          for (const section of msg.message.sections ?? []) {
            const item = section.items.find(i => i.title === itemTitle)
            if (item) { itemId = item.id; break }
          }
        }
        if (itemId) break
      }
      if (!itemId) throw new Error(`List item "${itemTitle}" not found in last bot response`)

      const count = await this.getCurrentOutboundCount()
      await fetch(`${this.serverUrl}/api/v1/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, itemId, itemTitle })
      })
      const responses = await this.waitForResponse(count)
      this.lastOutboundMessages = responses
      return responses
    })
  }

  get expect() {
    return {
      text: (expected: string) => this.runStep(`expect.text("${expected}")`, async () => {
        const found = this.lastOutboundMessages.some(m =>
          m.message.type === 'text' && m.message.text?.includes(expected)
        )
        if (!found) {
          const actual = this.lastOutboundMessages
            .filter(m => m.message.type === 'text')
            .map(m => m.message.text)
            .join(' | ')
          throw new Error(`Expected text containing "${expected}" but got: "${actual}"`)
        }
      }),

      buttons: (titles: string[]) => this.runStep(`expect.buttons(${JSON.stringify(titles)})`, async () => {
        const allButtons: string[] = []
        for (const msg of this.lastOutboundMessages) {
          if (msg.message.type === 'buttons') {
            allButtons.push(...(msg.message.buttons?.map(b => b.title) ?? []))
          }
        }
        for (const title of titles) {
          if (!allButtons.includes(title)) {
            throw new Error(`Expected button "${title}" but got buttons: ${JSON.stringify(allButtons)}`)
          }
        }
      }),

      list: (options?: { sections?: string[]; items?: string[] }) => this.runStep('expect.list()', async () => {
        const haslist = this.lastOutboundMessages.some(m => m.message.type === 'list')
        if (!haslist) throw new Error('Expected a list message but none was received')
        if (options?.sections) {
          const actualSections: string[] = []
          for (const msg of this.lastOutboundMessages) {
            if (msg.message.type === 'list') {
              actualSections.push(...(msg.message.sections?.map(s => s.title) ?? []))
            }
          }
          for (const section of options.sections) {
            if (!actualSections.includes(section)) {
              throw new Error(`Expected section "${section}" but got: ${JSON.stringify(actualSections)}`)
            }
          }
        }
        if (options?.items) {
          const actualItems: string[] = []
          for (const msg of this.lastOutboundMessages) {
            if (msg.message.type === 'list') {
              for (const section of msg.message.sections ?? []) {
                actualItems.push(...section.items.map(i => i.title))
              }
            }
          }
          for (const item of options.items) {
            if (!actualItems.includes(item)) {
              throw new Error(`Expected list item "${item}" but got: ${JSON.stringify(actualItems)}`)
            }
          }
        }
      }),

      noError: () => this.runStep('expect.noError()', async () => {
        // passes by default — errors would have thrown already
      })
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
