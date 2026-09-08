import type { ConvkitEvent, ConvkitReply } from '@convkit/protocol'

// Transform a Convkit event into an Infobip webhook payload
// that the bot's existing Infobip handler can process
export function convkitEventToInfobip(event: ConvkitEvent): unknown {
  const base = {
    from: event.user.phone.replace('+', ''),
    to: '447860099299', // placeholder sender number
    integrationType: 'WHATSAPP',
    receivedAt: event.timestamp,
    messageId: event.message.type + '_' + Date.now(),
    pairedMessageId: null,
    callbackData: null
  }

  let message: unknown

  if (event.message.type === 'text') {
    message = {
      type: 'TEXT',
      text: (event.message as any).text
    }
  } else if (event.message.type === 'button') {
    message = {
      type: 'INTERACTIVE_BUTTON_REPLY',
      id: (event.message as any).buttonId,
      title: (event.message as any).buttonTitle
    }
  } else if (event.message.type === 'list') {
    message = {
      type: 'INTERACTIVE_LIST_REPLY',
      id: (event.message as any).itemId,
      title: (event.message as any).itemTitle
    }
  } else {
    message = { type: 'TEXT', text: '' }
  }

  return {
    results: [{ ...base, message }],
    messageCount: 1,
    pendingMessageCount: 0
  }
}

// Transform an Infobip bot response into a Convkit reply
export function infobipResponseToConvkit(response: unknown): ConvkitReply[] {
  const res = response as any
  const messages = res?.messages ?? []
  const replies: ConvkitReply[] = []

  for (const msg of messages) {
    const content = msg?.content
    if (!content) continue

    if (content.type === 'text') {
      replies.push({ type: 'text', text: content.text ?? '' })
    } else if (content.type === 'interactive') {
      const interactive = content.interactive
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
