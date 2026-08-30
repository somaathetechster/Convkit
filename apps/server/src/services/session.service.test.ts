import { describe, it, expect, beforeEach } from 'vitest'
import {
  createUser,
  createSession,
  getSession,
  getSessionByUser,
  addMessage,
  resetSession,
  getUsers,
  getSessions
} from './session.service.js'

describe('session service', () => {
  it('creates a user with correct fields', () => {
    const user = createUser({ name: 'Test', phone: '+2348012345678', country: 'NG' })
    expect(user.id).toMatch(/^user_/)
    expect(user.phone).toBe('+2348012345678')
    expect(user.name).toBe('Test')
    expect(user.country).toBe('NG')
  })

  it('creates a session for a user', () => {
    const user = createUser({ name: 'Alice', phone: '+2348000000001' })
    const session = createSession(user)
    expect(session.id).toMatch(/^session_/)
    expect(session.user.id).toBe(user.id)
    expect(session.messages).toHaveLength(0)
  })

  it('retrieves session by user id', () => {
    const user = createUser({ name: 'Bob', phone: '+2348000000002' })
    const session = createSession(user)
    const found = getSessionByUser(user.id)
    expect(found?.id).toBe(session.id)
  })

  it('adds messages to a session', () => {
    const user = createUser({ name: 'Carol', phone: '+2348000000003' })
    const session = createSession(user)
    const msg = addMessage(session.id, 'inbound', { type: 'text', text: 'Hello' })
    expect(msg).not.toBeNull()
    expect(msg?.direction).toBe('inbound')
    expect((msg?.message as any).text).toBe('Hello')
    const updated = getSession(session.id)
    expect(updated?.messages).toHaveLength(1)
  })

  it('resets a session correctly', () => {
    const user = createUser({ name: 'Dan', phone: '+2348000000004' })
    const session = createSession(user)
    addMessage(session.id, 'inbound', { type: 'text', text: 'Hello' })
    addMessage(session.id, 'outbound', { type: 'text', text: 'Hi!' })
    const reset = resetSession(session.id)
    expect(reset?.messages).toHaveLength(0)
    expect(reset?.state).toEqual({})
  })

  it('returns null when adding message to nonexistent session', () => {
    const result = addMessage('fake_session', 'inbound', { type: 'text', text: 'test' })
    expect(result).toBeNull()
  })
})