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
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  message: { type: string; text?: string }
  timestamp: string
}

interface WSEvent {
  event: string
  data: any
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<WSEvent[]>([])
  const [input, setInput] = useState('')
  const [botUrl, setBotUrl] = useState('http://localhost:5000/webhook')
  const [botRegistered, setBotRegistered] = useState(false)
  const [connected, setConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    connectWS()
    return () => ws.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function connectWS() {
    const socket = new WebSocket(WS_URL)
    socket.onopen = () => setConnected(true)
    socket.onclose = () => {
      setConnected(false)
      setTimeout(connectWS, 2000)
    }
    socket.onmessage = (e) => {
      let payload: WSEvent
      try {
        payload = JSON.parse(e.data)
      } catch {
        return
      }

      setEvents(prev => [payload, ...prev].slice(0, 100))

      if (
        payload.event === 'message.sent' ||
        payload.event === 'message.received'
      ) {
        const msg: Message = payload.data?.message
        if (!msg || !msg.id) return
        if (seenIds.current.has(msg.id)) return
        seenIds.current.add(msg.id)
        setMessages(prev => [...prev, msg])
      }
    }
    ws.current = socket
  }

  async function createUser() {
    const res = await fetch(`${SERVER}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        phone: '+2348012345678',
        country: 'NG'
      })
    })
    const data = await res.json()
    setUser(data.user)
    setSession(data.session)
    setMessages([])
    seenIds.current.clear()
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
    const text = input.trim()
    setInput('')
    await fetch(`${SERVER}/api/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        message: { type: 'text', text }
      })
    })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 text-sm overflow-hidden font-mono">

      {/* Left panel */}
      <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col gap-5 p-4 overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Convkit</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${connected ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Bot Webhook</p>
          <input
            value={botUrl}
            onChange={e => setBotUrl(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 mb-2 outline-none focus:border-zinc-500"
          />
          <button
            onClick={registerBot}
            className={`w-full text-[11px] py-1.5 rounded transition-colors ${
              botRegistered
                ? 'bg-green-950 text-green-400'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {botRegistered ? '✓ Bot registered' : 'Register bot'}
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Virtual User</p>
          {user ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-[11px] space-y-0.5">
              <p className="text-zinc-200 font-semibold">{user.name}</p>
              <p className="text-zinc-400">{user.phone}</p>
              <p className="text-zinc-400">{user.country}</p>
              <p className="text-zinc-600 pt-1 text-[10px]">{user.id}</p>
            </div>
          ) : (
            <button
              onClick={createUser}
              className="w-full text-[11px] py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              + Create user
            </button>
          )}
        </div>

        {session && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Session</p>
            <p className="text-[10px] text-zinc-600 break-all">{session.id}</p>
          </div>
        )}
      </div>

      {/* Center — chat */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-zinc-400 text-[11px]">Conversation</span>
          {user && <span className="text-zinc-600 text-[11px]">— {user.phone}</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
              {user ? 'Send a message to start' : 'Create a user to begin'}
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-sm px-3 py-2 rounded-lg text-[12px] leading-relaxed ${
                msg.direction === 'inbound'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
              }`}>
                <p className="whitespace-pre-wrap">{msg.message?.text ?? ''}</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-800 p-3 flex gap-2 shrink-0">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-[12px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500"
            placeholder={user ? 'Type a message...' : 'Create a user first'}
            value={input}
            disabled={!user}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={sendMessage}
            disabled={!user || !input.trim()}
            className="px-4 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-[12px] text-zinc-200 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Right — event inspector */}
      <div className="w-72 shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-2 shrink-0">
          <span className="text-zinc-400 text-[11px]">Event Inspector</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {events.length === 0 && (
            <p className="text-zinc-700 text-[11px] p-2">No events yet</p>
          )}
          {events.map((ev, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-2">
              <p className="text-green-400 text-[11px] mb-1">{ev.event}</p>
              <pre className="text-zinc-500 text-[10px] whitespace-pre-wrap break-all">
                {JSON.stringify(ev.data, null, 2).slice(0, 300)}
              </pre>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}