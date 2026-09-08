import type {
  ConvkitEvent,
  ConvkitMessage,
  ConvkitReply,
  ButtonsReply,
  ListReply,
  TextReply,
  EventType
} from '@convkit/protocol'

export interface ConvkitBotConfig {
  emulatorUrl: string
  webhookPath?: string
}

export type EventHandler = (event: ConvkitEvent) => Promise<void> | void

export interface BotContext {
  sessionId: string
  event: ConvkitEvent
}

export type { ConvkitEvent, ConvkitMessage, ConvkitReply, ButtonsReply, ListReply, TextReply, EventType }
