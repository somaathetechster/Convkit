// Protocol version
export const PROTOCOL_VERSION = '1.0'

// User
export interface ConvkitUser {
  id: string
  phone: string
  name?: string
  country?: string
  metadata?: Record<string, unknown>
}

// Message types
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'button' | 'list'

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

export type ConvkitMessage = TextMessage | ButtonMessage | ListMessage

// Event types
export type EventType =
  | 'message.received'
  | 'message.sent'
  | 'button.clicked'
  | 'list.selected'
  | 'session.started'
  | 'session.reset'
  | 'user.created'
  | 'user.updated'

// Base event
export interface ConvkitEvent {
  version: string
  event: EventType
  timestamp: string
  user: ConvkitUser
  message: ConvkitMessage
  sessionId: string
}

// Outbound — what Convkit POSTs to the bot's webhook
export interface InboundWebhookPayload extends ConvkitEvent {}

// Inbound — what the bot sends back to Convkit
export interface OutboundMessage {
  to: string
  message: ConvkitMessage
}
