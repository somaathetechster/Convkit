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

interface UserForm {
  name: string
  phone: string
  country: string
}

const COUNTRIES = ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW']

function formatTime(ts: string): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Message[]>>({})
  const [events, setEvents] = useState<WSEvent[]>([])
  const [input, setInput] = useState('')
  const [botUrl, setBotUrl] = useState('http://localhost:5000/webhook')
  const [botRegistered, setBotRegistered] = useState(false)
  const [connected, setConnected] = useState(false)
  const [wsStatus, setWsStatus] = useState('Connecting...')
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState<UserForm>({ name: '', phone: '', country: 'NG' })
  const [loadingUser, setLoadingUser] = useState(false)
  const [loadingBot, setLoadingBot] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)

  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef<Set<string>>(new Set())

  const activeUser = users.find(u => u.id === activeUserId) ?? null
  const activeSession = activeUserId ? sessions[activeUserId] : null
  const activeMessages = activeUserId ? (messagesByUser[activeUserId] ?? []) : []

  useEffect(() => { connectWS() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages])

  function connectWS() {
    const socket = new WebSocket(WS_URL)

    socket.onopen = () => {
      setConnected(true)
      setWsStatus('Connected')
    }

    socket.onclose = () => {
      setConnected(false)
      setWsStatus('Reconnecting...')
      setTimeout(connectWS, 2000)
    }

    socket.onmessage = (e) => {
      let payload: WSEvent
      try { payload = JSON.parse(e.data) } catch { return }

      setEvents(prev => [payload, ...prev].slice(0, 100))

      if (payload.event === 'message.sent' || payload.event === 'message.received') {
        const msg: Message = payload.data?.message
        if (!msg?.id) return
        if (seenIds.current.has(msg.id)) return
        seenIds.current.add(msg.id)

        const sessionId = payload.data?.sessionId
        const userId = Object.entries(sessions).find(([, s]) => s.id === sessionId)?.[0]
        if (!userId) return

        setMessagesByUser(prev => ({
          ...prev,
          [userId]: [...(prev[userId] ?? []), msg]
        }))
      }
    }

    ws.current = socket
  }

  async function createUser() {
    if (!userForm.name.trim() || !userForm.phone.trim()) return
    setLoadingUser(true)
    try {
      const res = await fetch(`${SERVER}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })
      const data = await res.json()
      setUsers(prev => [...prev, data.user])
      setSessions(prev => ({ ...prev, [data.user.id]: data.session }))
      setMessagesByUser(prev => ({ ...prev, [data.user.id]: [] }))
      setActiveUserId(data.user.id)
      setShowUserForm(false)
      setUserForm({ name: '', phone: '', country: 'NG' })
    } finally {
      setLoadingUser(false)
    }
  }

  async function registerBot() {
    setLoadingBot(true)
    try {
      await fetch(`${SERVER}/api/v1/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Bot', webhookUrl: botUrl })
      })
      setBotRegistered(true)
    } finally {
      setLoadingBot(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !activeUser) return
    const text = input.trim()
    setInput('')
    setLoadingSend(true)
    try {
      await fetch(`${SERVER}/api/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id, message: { type: 'text', text } })
      })
    } finally {
      setLoadingSend(false)
    }
  }

  async function resetSession() {
    if (!activeSession || !activeUserId) return
    const res = await fetch(`${SERVER}/api/v1/sessions/${activeSession.id}/reset`, {
      method: 'POST'
    })
    if (res.ok) {
      setMessagesByUser(prev => ({ ...prev, [activeUserId]: [] }))
      seenIds.current.clear()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 text-sm overflow-hidden font-mono">

      {/* Left panel */}
      <div className="w-64 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Convkit</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? 'bg-green-950 text-green-400' : 'bg-yellow-950 text-yellow-400'}`}>
            {wsStatus}
          </span>
        </div>

        {/* Bot webhook */}
        <div className="p-4 border-b border-zinc-800">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Bot Webhook</p>
          <input
            value={botUrl}
            onChange={e => setBotUrl(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 mb-2 outline-none focus:border-zinc-500"
          />
          <button
            onClick={registerBot}
            disabled={loadingBot}
            className={`w-full text-[11px] py-1.5 rounded transition-colors ${
              botRegistered ? 'bg-green-950 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            } disabled:opacity-50`}
          >
            {loadingBot ? 'Registering...' : botRegistered ? '✓ Bot registered' : 'Register bot'}
          </button>
        </div>

        {/* Users */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Users</p>
            <button
              onClick={() => setShowUserForm(v => !v)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showUserForm ? 'Cancel' : '+ New'}
            </button>
          </div>

          {showUserForm && (
            <div className="mx-4 mb-3 bg-zinc-900 border border-zinc-700 rounded p-3 flex flex-col gap-2">
              <input
                placeholder="Name"
                value={userForm.name}
                onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
              />
              <input
                placeholder="Phone e.g. +2348012345678"
                value={userForm.phone}
                onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
              />
              <select
                value={userForm.country}
                onChange={e => setUserForm(p => ({ ...p, country: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={createUser}
                disabled={loadingUser || !userForm.name.trim() || !userForm.phone.trim()}
                className="w-full text-[11px] py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 transition-colors"
              >
                {loadingUser ? 'Creating...' : 'Create user'}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1 px-3 pb-3">
            {users.length === 0 && !showUserForm && (
              <p className="text-[11px] text-zinc-600 px-1 py-2">No users yet. Click + New to create one.</p>
            )}
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setActiveUserId(user.id)}
                className={`w-full text-left rounded p-2 transition-colors border ${
                  activeUserId === user.id
                    ? 'bg-zinc-800 border-zinc-600'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <p className="text-[11px] text-zinc-200 font-medium">{user.name}</p>
                <p className="text-[10px] text-zinc-500">{user.phone}</p>
                <p className="text-[10px] text-zinc-600">{user.country}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Session */}
        {activeSession && (
          <div className="p-4 border-t border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Session</p>
            <p className="text-[10px] text-zinc-600 break-all mb-2">{activeSession.id}</p>
            <button
              onClick={resetSession}
              className="w-full text-[11px] py-1.5 rounded bg-zinc-800 hover:bg-red-950 hover:text-red-400 text-zinc-400 transition-colors"
            >
              Reset session
            </button>
          </div>
        )}
      </div>

      {/* Center — chat */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-zinc-400 text-[11px]">Conversation</span>
          {activeUser && <span className="text-zinc-600 text-[11px]">— {activeUser.name} · {activeUser.phone}</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {!activeUser && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-700">
              <p className="text-[11px]">No user selected</p>
              <p className="text-[10px]">Create a user from the left panel to begin</p>
            </div>
          )}
          {activeUser && activeMessages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
              Send a message to start the conversation
            </div>
          )}
          {activeMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-sm px-3 py-2 rounded-lg text-[12px] leading-relaxed ${
                msg.direction === 'inbound'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
              }`}>
                <p className="whitespace-pre-wrap">{msg.message?.text ?? ''}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-800 p-3 flex gap-2 shrink-0">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-[12px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 min-w-0"
            placeholder={activeUser ? 'Type a message...' : 'Select a user first'}
            value={input}
            disabled={!activeUser}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={sendMessage}
            disabled={!activeUser || !input.trim() || loadingSend}
            className="px-4 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-[12px] text-zinc-200 transition-colors shrink-0"
          >
            {loadingSend ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Right — event inspector */}
      <div className="w-72 shrink-0 border-l border-zinc-800 flex-col overflow-hidden hidden lg:flex">
        <div className="border-b border-zinc-800 px-4 py-2 shrink-0 flex items-center justify-between">
          <span className="text-zinc-400 text-[11px]">Event Inspector</span>
          <span className="text-zinc-600 text-[10px]">{events.length} events</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {events.length === 0 && (
            <div className="p-3 text-[11px] text-zinc-600 leading-relaxed">
              <p className="text-zinc-500 mb-1">No events yet.</p>
              <p>Events appear here in real time as messages flow between the UI, Convkit server, and your bot.</p>
              <p className="mt-2">To see events:</p>
              <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                <li>Register your bot</li>
                <li>Create a user</li>
                <li>Send a message</li>
              </ol>
            </div>
          )}
          {events.map((ev, i) => (
            <div
              key={i}
              className={`bg-zinc-900 border rounded p-2 ${
                ev.event === 'bot.error' ? 'border-red-800' : 'border-zinc-800'
              }`}
            >
              <p className={`text-[11px] mb-1 ${ev.event === 'bot.error' ? 'text-red-400' : 'text-green-400'}`}>
                {ev.event}
              </p>
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