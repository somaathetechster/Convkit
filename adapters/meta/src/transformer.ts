import type { ConvkitEvent, ConvkitReply } from '@convkit/protocol'

// Transform a Convkit event into a Meta (WhatsApp Cloud API) webhook payload
// that the bot's existing Meta handler can process
export function convkitEventToMeta(event: ConvkitEvent): unknown {
  const waId = event.user.phone.replace('+', '')
  const timestamp = String(Math.floor(new Date(event.timestamp).getTime() / 1000))

  const base = {
    from: waId,
    id: `wamid.${event.message.type}_${Date.now()}`,
    timestamp
  }

  let message: unknown

  if (event.message.type === 'text') {
    message = {
      ...base,
      type: 'text',
      text: { body: (event.message as any).text }
    }
  } else if (event.message.type === 'button') {
    message = {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: (event.message as any).buttonId,
          title: (event.message as any).buttonTitle
        }
      }
    }
  } else if (event.message.type === 'list') {
    message = {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'list_reply',
        list_reply: {
          id: (event.message as any).itemId,
          title: (event.message as any).itemTitle
        }
      }
    }
  } else {
    message = { ...base, type: 'text', text: { body: '' } }
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '16505551111',
                phone_number_id: 'PHONE_NUMBER_ID'
              },
              contacts: [
                {
                  profile: { name: event.user.name ?? '' },
                  wa_id: waId
                }
              ],
              messages: [message]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }
}

// Transform a Meta bot response into a Convkit reply.
// Meta bots send one message object per call, but some send an array — both are accepted.
export function metaResponseToConvkit(response: unknown): ConvkitReply[] {
  const messages: any[] = Array.isArray(response)
    ? response
    : (response as any)?.messages ?? (response ? [response] : [])

  const replies: ConvkitReply[] = []

  for (const msg of messages) {
    if (!msg) continue

    if (msg.type === 'text') {
      replies.push({ type: 'text', text: msg.text?.body ?? '' })
    } else if (msg.type === 'interactive') {
      const interactive = msg.interactive
      if (interactive?.type === 'button') {
        const buttons = (interactive.action?.buttons ?? []).map((b: any) => ({
          id: b.reply?.id ?? b.id,
          title: b.reply?.title ?? b.title
        }))
        replies.push({
          type: 'buttons',
          text: interactive.body?.text ?? '',
          buttons
        })
      } else if (interactive?.type === 'list') {
        const sections = (interactive.action?.sections ?? []).map((s: any) => ({
          title: s.title ?? '',
          items: (s.rows ?? []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description
          }))
        }))
        replies.push({
          type: 'list',
          text: interactive.body?.text ?? '',
          buttonText: interactive.action?.button ?? 'Select',
          sections
        })
      }
    }
  }

  return replies
}
