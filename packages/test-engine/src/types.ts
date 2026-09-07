export interface TestConfig {
  serverUrl: string
  botWebhookUrl: string
  timeoutMs?: number
  stepDelayMs?: number
}

export interface StepResult {
  step: string
  passed: boolean
  error?: string
  duration: number
}

export interface ScenarioResult {
  name: string
  passed: boolean
  steps: StepResult[]
  duration: number
  error?: string
}

export interface TestReport {
  passed: boolean
  total: number
  passing: number
  failing: number
  duration: number
  scenarios: ScenarioResult[]
}

export interface BotResponse {
  messages: ReceivedMessage[]
}

export interface ReceivedMessage {
  id: string
  direction: 'inbound' | 'outbound'
  message: {
    type: string
    text?: string
    buttons?: { id: string; title: string }[]
    sections?: { title: string; items: { id: string; title: string; description?: string }[] }[]
    buttonId?: string
    buttonTitle?: string
    itemId?: string
    itemTitle?: string
  }
  timestamp: string
}
