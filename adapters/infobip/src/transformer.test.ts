import { describe, it, expect } from 'vitest'
import { convkitEventToInfobip, infobipResponseToConvkit } from './transformer.js'
import type { ConvkitEvent, ConvkitMessage } from '@convkit/protocol'

function makeEvent(message: ConvkitMessage, overrides: Partial<ConvkitEvent> = {}): ConvkitEvent {
  return {
    version: '1.0',
    event: 'message.received',
    timestamp: '2026-09-08T10:00:00.000Z',
    user: { id: 'user_1', phone: '+2348012345678', name: 'Test User', country: 'NG' },
    message,
    sessionId: 'session_1',
    ...overrides
  }
}

describe('convkitEventToInfobip', () => {
  it('transforms a text message', () => {
    const out = convkitEventToInfobip(makeEvent({ type: 'text', text: 'Hello' })) as any

    expect(out.results).toHaveLength(1)
    expect(out.results[0].message.type).toBe('TEXT')
    expect(out.results[0].message.text).toBe('Hello')
    expect(out.messageCount).toBe(1)
    expect(out.pendingMessageCount).toBe(0)
  })

  it('transforms a button click', () => {
    const out = convkitEventToInfobip(
      makeEvent({ type: 'button', buttonId: 'features', buttonTitle: 'Features' })
    ) as any

    expect(out.results[0].message.type).toBe('INTERACTIVE_BUTTON_REPLY')
    expect(out.results[0].message.id).toBe('features')
    expect(out.results[0].message.title).toBe('Features')
  })

  it('transforms a list selection', () => {
    const out = convkitEventToInfobip(
      makeEvent({ type: 'list', itemId: 'row1', itemTitle: 'Item 1' })
    ) as any

    expect(out.results[0].message.type).toBe('INTERACTIVE_LIST_REPLY')
    expect(out.results[0].message.id).toBe('row1')
    expect(out.results[0].message.title).toBe('Item 1')
  })

  it('produces the envelope an Infobip bot expects', () => {
    const out = convkitEventToInfobip(makeEvent({ type: 'text', text: 'Hello' })) as any
    const result = out.results[0]

    // Phone is sent without the leading + , as Infobip does
    expect(result.from).toBe('2348012345678')
    expect(result.to).toBe('447860099299')
    expect(result.integrationType).toBe('WHATSAPP')
    expect(result.receivedAt).toBe('2026-09-08T10:00:00.000Z')
    expect(result.messageId).toMatch(/^text_\d+$/)
    expect(result.pairedMessageId).toBeNull()
    expect(result.callbackData).toBeNull()
    expect(Object.keys(out).sort()).toEqual(['messageCount', 'pendingMessageCount', 'results'])
  })

  it('falls back to an empty TEXT message for unknown types', () => {
    const out = convkitEventToInfobip(makeEvent({ type: 'image' } as unknown as ConvkitMessage)) as any
    expect(out.results[0].message).toEqual({ type: 'TEXT', text: '' })
  })
})

describe('infobipResponseToConvkit', () => {
  it('transforms a text response', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        { from: '447860099299', to: '2348012345678', content: { type: 'text', text: 'Hello back!' } }
      ]
    })

    expect(replies).toEqual([{ type: 'text', text: 'Hello back!' }])
  })

  it('transforms an interactive buttons response', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        {
          content: {
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: 'Choose an option:' },
              action: {
                buttons: [
                  { type: 'reply', reply: { id: 'btn1', title: 'Option 1' } },
                  { type: 'reply', reply: { id: 'btn2', title: 'Option 2' } }
                ]
              }
            }
          }
        }
      ]
    })

    expect(replies).toEqual([
      {
        type: 'buttons',
        text: 'Choose an option:',
        buttons: [
          { id: 'btn1', title: 'Option 1' },
          { id: 'btn2', title: 'Option 2' }
        ]
      }
    ])
  })

  it('transforms an interactive list response', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        {
          content: {
            type: 'interactive',
            interactive: {
              type: 'list',
              body: { text: 'Pick one:' },
              action: {
                button: 'Select',
                sections: [
                  {
                    title: 'Section 1',
                    rows: [{ id: 'row1', title: 'Item 1', description: 'Description' }]
                  }
                ]
              }
            }
          }
        }
      ]
    })

    expect(replies).toEqual([
      {
        type: 'list',
        text: 'Pick one:',
        buttonText: 'Select',
        sections: [
          {
            title: 'Section 1',
            items: [{ id: 'row1', title: 'Item 1', description: 'Description' }]
          }
        ]
      }
    ])
  })

  it('returns [] for empty, null and malformed responses', () => {
    expect(infobipResponseToConvkit(null)).toEqual([])
    expect(infobipResponseToConvkit(undefined)).toEqual([])
    expect(infobipResponseToConvkit({})).toEqual([])
    expect(infobipResponseToConvkit({ messages: [] })).toEqual([])
    expect(infobipResponseToConvkit({ messages: [{}] })).toEqual([])
    expect(infobipResponseToConvkit({ messages: [{ content: { type: 'audio' } }] })).toEqual([])
  })

  it('transforms several messages in one response', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        { content: { type: 'text', text: 'First' } },
        { content: { type: 'text', text: 'Second' } }
      ]
    })

    expect(replies).toHaveLength(2)
    expect(replies.map(r => (r as any).text)).toEqual(['First', 'Second'])
  })

  it('accepts flat button shapes as well as nested reply objects', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        {
          content: {
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: 'Choose:' },
              action: { buttons: [{ id: 'flat', title: 'Flat' }] }
            }
          }
        }
      ]
    })

    expect((replies[0] as any).buttons).toEqual([{ id: 'flat', title: 'Flat' }])
  })

  it('defaults missing text and buttonText', () => {
    const replies = infobipResponseToConvkit({
      messages: [
        { content: { type: 'text' } },
        {
          content: {
            type: 'interactive',
            interactive: { type: 'list', action: { sections: [] } }
          }
        }
      ]
    })

    expect(replies[0]).toEqual({ type: 'text', text: '' })
    expect(replies[1]).toEqual({ type: 'list', text: '', buttonText: 'Select', sections: [] })
  })
})

describe('round trip', () => {
  it('a Convkit text event becomes a payload an Infobip bot can answer, and the answer comes back', () => {
    const event = makeEvent({ type: 'text', text: 'hello' })
    const inbound = convkitEventToInfobip(event) as any

    // What a real Infobip bot handler would read off the webhook
    const incoming = inbound.results[0]
    expect(incoming.message.type).toBe('TEXT')
    expect(incoming.message.text).toBe('hello')

    // What that bot would send back, echoing the sender
    const botResponse = {
      messages: [
        {
          from: incoming.to,
          to: incoming.from,
          content: { type: 'text', text: `You said: ${incoming.message.text}` }
        }
      ]
    }

    expect(infobipResponseToConvkit(botResponse)).toEqual([
      { type: 'text', text: 'You said: hello' }
    ])
  })
})
