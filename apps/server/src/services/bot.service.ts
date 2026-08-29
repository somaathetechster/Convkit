export interface Bot {
  id: string
  name: string
  webhookUrl: string
  registeredAt: string
}

const bots = new Map<string, Bot>()

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function registerBot(name: string, webhookUrl: string): Bot {
  const bot: Bot = {
    id: `bot_${generateId()}`,
    name,
    webhookUrl,
    registeredAt: new Date().toISOString()
  }
  bots.set(bot.id, bot)
  return bot
}

export function getBots(): Bot[] {
  return Array.from(bots.values())
}

export function getActiveBot(): Bot | undefined {
  return Array.from(bots.values())[0]
}