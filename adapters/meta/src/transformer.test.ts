import { describe, it, expect } from 'vitest'
import { convkitEventToMeta, metaResponseToConvkit } from './transformer.js'
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

// The single message object a Meta bot handler reads off the webhook
function inboundMessage(payload: unknown): any {
  return (payload as any).entry[0].changes[0].value.messages[0]
}

describe('convkitEventToMeta', () => {
  it('transforms a text message', () => {
    const out = convkitEventToMeta(makeEvent({ type: 'text', text: 'Hello' })) as any
    const message = inboundMessage(out)

    expect(message.type).toBe('text')
    expect(message.text.body).toBe('Hello')
    expect(out.object).toBe('whatsapp_business_account')
    expect(out.entry[0].changes[0].field).toBe('messages')
  })

  it('transforms a button click', () => {
    const out = convkitEventToMeta(
      makeEvent({ type: 'button', buttonId: 'features', buttonTitle: 'Features' })
    )
    const message = inboundMessage(out)

    expect(message.type).toBe('interactive')
    expect(message.interactive.type).toBe('button_reply')
    expect(message.interactive.button_reply).toEqual({ id: 'features', title: 'Features' })
  })

  it('transforms a list selection', () => {
    const out = convkitEventToMeta(makeEvent({ type: 'list', itemId: 'row1', itemTitle: 'Item 1' }))
    const message = inboundMessage(out)

    expect(message.type).toBe('interactive')
    expect(message.interactive.type).toBe('list_reply')
    expect(message.interactive.list_reply).toEqual({ id: 'row1', title: 'Item 1' })
  })

  it('produces the envelope a Meta bot expects', () => {
    const out = convkitEventToMeta(makeEvent({ type: 'text', text: 'Hello' })) as any
    const value = out.entry[0].changes[0].value
    const message = inboundMessage(out)

    expect(value.messaging_product).toBe('whatsapp')
    expect(value.metadata).toEqual({
      display_phone_number: '16505551111',
      phone_number_id: 'PHONE_NUMBER_ID'
    })
    // Phone is sent without the leading + , as Meta does
    expect(value.contacts).toEqual([{ profile: { name: 'Test User' }, wa_id: '2348012345678' }])
    expect(message.from).toBe('2348012345678')
    expect(message.id).toMatch(/^wamid\./)
    // Meta timestamps are unix seconds, as a string, not the protocol's ISO 8601
    expect(message.timestamp).toBe('1788861600')
    expect(message.timestamp).toBe(
      String(Math.floor(new Date('2026-09-08T10:00:00.000Z').getTime() / 1000))
    )
  })

  it('falls back to an empty text message for unknown types', () => {
    const out = convkitEventToMeta(makeEvent({ type: 'image' } as unknown as ConvkitMessage))
    const message = inboundMessage(out)

    expect(message.type).toBe('text')
    expect(message.text).toEqual({ body: '' })
  })

  it('defaults a missing user name', () => {
    const event = makeEvent({ type: 'text', text: 'Hello' })
    delete event.user.name

    const out = convkitEventToMeta(event) as any
    expect(out.entry[0].changes[0].value.contacts[0].profile.name).toBe('')
  })
})

describe('metaResponseToConvkit', () => {
  it('transforms a text response', () => {
    const replies = metaResponseToConvkit({
      messaging_product: 'whatsapp',
      to: '2348012345678',
      type: 'text',
      text: { body: 'Hello back!' }
    })

    expect(replies).toEqual([{ type: 'text', text: 'Hello back!' }])
  })

  it('transforms an interactive buttons response', () => {
    const replies = metaResponseToConvkit({
      messaging_product: 'whatsapp',
      to: '2348012345678',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Choose:' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn1', title: 'Option 1' } },
            { type: 'reply', reply: { id: 'btn2', title: 'Option 2' } }
          ]
        }
      }
    })

    expect(replies).toEqual([
      {
        type: 'buttons',
        text: 'Choose:',
        buttons: [
          { id: 'btn1', title: 'Option 1' },
          { id: 'btn2', title: 'Option 2' }
        ]
      }
    ])
  })

  it('transforms an interactive list response', () => {
    const replies = metaResponseToConvkit({
      messaging_product: 'whatsapp',
      to: '2348012345678',
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
    expect(metaResponseToConvkit(null)).toEqual([])
    expect(metaResponseToConvkit(undefined)).toEqual([])
    expect(metaResponseToConvkit({})).toEqual([])
    expect(metaResponseToConvkit([])).toEqual([])
    expect(metaResponseToConvkit({ type: 'audio' })).toEqual([])
    expect(metaResponseToConvkit({ type: 'interactive', interactive: { type: 'flow' } })).toEqual([])
  })

  it('accepts an array of messages', () => {
    const replies = metaResponseToConvkit([
      { type: 'text', text: { body: 'First' } },
      { type: 'text', text: { body: 'Second' } }
    ])

    expect(replies).toHaveLength(2)
    expect(replies.map(r => (r as any).text)).toEqual(['First', 'Second'])
  })

  it('accepts flat button shapes as well as nested reply objects', () => {
    const replies = metaResponseToConvkit({
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Choose:' },
        action: { buttons: [{ id: 'flat', title: 'Flat' }] }
      }
    })

    expect((replies[0] as any).buttons).toEqual([{ id: 'flat', title: 'Flat' }])
  })

  it('defaults missing text and buttonText', () => {
    const replies = metaResponseToConvkit([
      { type: 'text' },
      { type: 'interactive', interactive: { type: 'list', action: { sections: [] } } }
    ])

    expect(replies[0]).toEqual({ type: 'text', text: '' })
    expect(replies[1]).toEqual({ type: 'list', text: '', buttonText: 'Select', sections: [] })
  })
})

describe('round trip', () => {
  it('a Convkit text event becomes a payload a Meta bot can answer, and the answer comes back', () => {
    const event = makeEvent({ type: 'text', text: 'hello' })
    const inbound = convkitEventToMeta(event)

    // What a real Meta bot handler would read off the webhook
    const incoming = inboundMessage(inbound)
    expect(incoming.type).toBe('text')
    expect(incoming.text.body).toBe('hello')

    // What that bot would send back to the Cloud API, echoing the sender
    const botResponse = {
      messaging_product: 'whatsapp',
      to: incoming.from,
      type: 'text',
      text: { body: `You said: ${incoming.text.body}` }
    }

    expect(metaResponseToConvkit(botResponse)).toEqual([{ type: 'text', text: 'You said: hello' }])
  })
})
