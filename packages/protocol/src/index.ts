export const PROTOCOL_VERSION = '1.0'

export interface ConvkitUser {
  id: string
  phone: string
  name?: string
  country?: string
  metadata?: Record<string, unknown>
}

export interface TextMessage {
  type: 'text'
  text: string
}

export interface ButtonMessage {
  type: 'button'
  buttonId: string
  buttonTitle: string
}

export interface ListMessage {
  type: 'list'
  itemId: string
  itemTitle: string
}

export interface TextReply {
  type: 'text'
  text: string
}

export interface ButtonsReply {
  type: 'buttons'
  text: string
  buttons: { id: string; title: string }[]
}

export interface ListReply {
  type: 'list'
  text: string
  buttonText: string
  sections: {
    title: string
    items: { id: string; title: string; description?: string }[]
  }[]
}

export type ConvkitMessage = TextMessage | ButtonMessage | ListMessage
export type ConvkitReply = TextReply | ButtonsReply | ListReply

export type EventType =
  | 'message.received'
  | 'message.sent'
  | 'button.clicked'
  | 'list.selected'
  | 'session.started'
  | 'session.reset'
  | 'user.created'
  | 'user.updated'

export interface ConvkitEvent {
  version: string
  event: EventType
  timestamp: string
  user: ConvkitUser
  message: ConvkitMessage
  sessionId: string
}

export interface OutboundMessage {
  to: string
  message: ConvkitReply
}

export function isTextMessage(msg: ConvkitMessage): msg is TextMessage {
  return msg.type === 'text'
}

export function isButtonMessage(msg: ConvkitMessage): msg is ButtonMessage {
  return msg.type === 'button'
}

export function isListMessage(msg: ConvkitMessage): msg is ListMessage {
  return msg.type === 'list'
}

export interface RecordedMessage {
  id: string
  direction: 'inbound' | 'outbound'
  message: ConvkitMessage | ConvkitReply
  timestamp: string
}

export interface ConvkitRecording {
  id: string
  name: string
  createdAt: string
  user: ConvkitUser
  sessionId: string
  messages: RecordedMessage[]
}
