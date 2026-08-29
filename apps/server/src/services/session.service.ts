import { ConvkitUser, ConvkitMessage } from '@convkit/protocol'

export interface Session {
  id: string
  user: ConvkitUser
  messages: SessionMessage[]
  startedAt: string
  lastActivity: string
  state: Record<string, unknown>
}

export interface SessionMessage {
  id: string
  direction: 'inbound' | 'outbound'
  message: ConvkitMessage
  timestamp: string
}

const sessions = new Map<string, Session>()
const users = new Map<string, ConvkitUser>()

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function createUser(data: Partial<ConvkitUser>): ConvkitUser {
  const user: ConvkitUser = {
    id: data.id ?? `user_${generateId()}`,
    phone: data.phone ?? `+234${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    name: data.name,
    country: data.country ?? 'NG',
    metadata: data.metadata ?? {}
  }
  users.set(user.id, user)
  return user
}

export function getUsers(): ConvkitUser[] {
  return Array.from(users.values())
}

export function getUser(id: string): ConvkitUser | undefined {
  return users.get(id)
}

export function createSession(user: ConvkitUser): Session {
  const session: Session = {
    id: `session_${generateId()}`,
    user,
    messages: [],
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    state: {}
  }
  sessions.set(session.id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function getSessionByUser(userId: string): Session | undefined {
  return Array.from(sessions.values()).find(s => s.user.id === userId)
}

export function addMessage(sessionId: string, direction: 'inbound' | 'outbound', message: ConvkitMessage): SessionMessage | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  const msg: SessionMessage = {
    id: `msg_${generateId()}`,
    direction,
    message,
    timestamp: new Date().toISOString()
  }
  session.messages.push(msg)
  session.lastActivity = msg.timestamp
  return msg
}

export function resetSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  session.messages = []
  session.state = {}
  session.lastActivity = new Date().toISOString()
  return session
}

export function getSessions(): Session[] {
  return Array.from(sessions.values())
}