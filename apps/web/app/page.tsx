'use client'

import { useState, useEffect, useRef } from 'react'

const SERVER = 'http://localhost:4000'
const WS_URL = 'ws://localhost:4000/ws'

interface User {
  id: string
  name: string
  phone: string
  country: string
}

interface Session {
  id: string
  user: User
  messages: SessionMessage[]
}

interface SessionMessage {
  id: string
  direction: 'inbound' | 'outbound'
  message: { type: string; text?: string }
  timestamp: string
}

interface ConvkitEvent {
  event: string
  data: unknown
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [events, setEvents] = useState<ConvkitEvent[]>([])
  const [input, setInput] = useState('')
  const [botUrl, setBotUrl] = useState('http://localhost:5000/webhook')
  const [botRegistered, setBotRegistered] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const ws = useRef<WebSocket | null>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function connect() {
    const socket = new WebSocket(WS_URL)
    socket.onopen = () => setStatus('Connected')
    socket.onclose = () => {
      setStatus('Disconnected')
      setTimeout(connect, 2000)
    }
    socket.onmessage = (e) => {
      const payload: ConvkitEvent = JSON.parse(e.data)
      setEvents(prev => [payload, ...prev].slice(0, 50))
      if (payload.event === 'message.received') {
        const { message } = payload.data as any
        setMessages(prev => [...prev, message])
      }
    }
    ws.current = socket
  }

  async function createUser() {
    const res = await fetch(`${SERVER}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', phone: '+2348012345678', country: 'NG' })
    })
    const data = await res.json()
    setUser(data.user)
    setSession(data.session)
    setMessages([])
  }

  async function registerBot() {
    await fetch(`${SERVER}/api/v1/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Bot', webhookUrl: botUrl })
    })
    setBotRegistered(true)
  }

  async function sendMessage() {
    if (!input.trim() || !user) return
    const message = { type: 'text', text: input }
    const optimistic: SessionMessage = {
      id: `tmp_${Date.now()}`,
      direction: 'inbound',
      message,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    await fetch(`${SERVER}/api/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, message })
    })
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden">

      {/* Left — Setup */}
      <div className="w-64 border-r border-zinc-800 flex flex-col p-4 gap-4 shrink-0">
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Convkit</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'Connected' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
            {status}
          </span>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Bot Webhook</p>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 mb-2"
            value={botUrl}
            onChange={e => setBotUrl(e.target.value)}
          />
          <button
            onClick={registerBot}
            className={`w-full text-xs py-1.5 rounded ${botRegistered ? 'bg-green-900 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
          >
            {botRegistered ? '✓ Bot registered' : 'Register bot'}
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Virtual User</p>
          {user ? (
            <div className="bg-zinc-900 rounded p-2 text-xs text-zinc-400">
              <p className="text-zinc-200 font-medium">{user.name}</p>
              <p>{user.phone}</p>
              <p>{user.country}</p>
              <p className="text-zinc-600 mt-1">{user.id}</p>
            </div>
          ) : (
            <button
              onClick={createUser}
              className="w-full text-xs py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              + Create user
            </button>
          )}
        </div>

        {session && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Session</p>
            <p className="text-zinc-600 text-xs">{session.id}</p>
          </div>
        )}
      </div>

      {/* Center — Chat */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          <span className="text-zinc-400 text-xs">Conversation</span>
          {user && <span className="text-zinc-600 text-xs">— {user.phone}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs">
              {user ? 'Send a message to start the conversation' : 'Create a user to begin'}
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-lg text-xs ${
                msg.direction === 'inbound'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
              }`}>
                <p>{msg.message.text}</p>
                <p className="text-zinc-500 text-[10px] mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        <div className="border-t border-zinc-800 p-3 flex gap-2">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600"
            placeholder={user ? 'Type a message...' : 'Create a user first'}
            value={input}
            disabled={!user}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!user || !input.trim()}
            className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-xs text-zinc-200"
          >
            Send
          </button>
        </div>
      </div>

      {/* Right — Event Inspector */}
      <div className="w-72 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0">
        <div className="border-b border-zinc-800 px-4 py-2">
          <span className="text-zinc-400 text-xs">Event Inspector</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {events.length === 0 && (
            <p className="text-zinc-700 text-xs p-2">No events yet</p>
          )}
          {events.map((ev, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs">
              <p className="text-green-400">{ev.event}</p>
              <pre className="text-zinc-500 text-[10px] mt-1 overflow-hidden text-ellipsis whitespace-pre-wrap">
                {JSON.stringify(ev.data, null, 2).slice(0, 200)}
              </pre>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}