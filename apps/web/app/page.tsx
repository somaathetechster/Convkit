'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface User {
  id: string
  name: string
  phone: string
  country: string
  metadata?: Record<string, unknown>
}

interface Session {
  id: string
  user: User
}

interface ConvkitRecording {
  id: string
  name: string
  createdAt: string
  user: { id: string; phone: string; name?: string }
  sessionId: string
  messages: {
    id: string
    direction: 'inbound' | 'outbound'
    message: { type: string; text?: string }
    timestamp: string
  }[]
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  message: {
    type: string
    text?: string
    buttonId?: string
    buttonTitle?: string
    itemId?: string
    itemTitle?: string
    buttons?: { id: string; title: string }[]
    buttonText?: string
    sections?: {
      title: string
      items: { id: string; title: string; description?: string }[]
    }[]
  }
  timestamp: string
}

interface WSEvent {
  event: string
  data: any
}

interface NetworkRequest {
  id: string
  timestamp: string
  method: string
  url: string
  requestBody: unknown
  responseBody: unknown
  status: number
  duration: number
  error?: string
}

interface UserForm {
  name: string
  country: string
  dialCode: string
  metadata: { key: string; value: string }[]
}

const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', dial: '+1', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dial: '+1', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dial: '+1', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', dial: '+238', flag: '🇨🇻' },
  { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic', dial: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', dial: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', dial: '+243', flag: '🇨🇩' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dial: '+1', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', dial: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', dial: '+1', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial: '+1', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', dial: '+686', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', dial: '+692', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', dial: '+691', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', dial: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', dial: '+680', flag: '🇵🇼' },
  { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', dial: '+1', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', dial: '+1', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', dial: '+685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', dial: '+378', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé and Príncipe', dial: '+239', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', dial: '+597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', dial: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', dial: '+1', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', dial: '+688', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', dial: '+678', flag: '🇻🇺' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
]

function formatTime(ts: string): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function useDrag(
  onDelta: (delta: number) => void,
  direction: 'horizontal' | 'vertical' = 'horizontal'
) {
  const dragging = useRef(false)
  const last = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    last.current = direction === 'horizontal' ? e.clientX : e.clientY

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return
      const curr = direction === 'horizontal' ? ev.clientX : ev.clientY
      onDelta(curr - last.current)
      last.current = curr
    }

    function onUp() {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDelta, direction])

  return onMouseDown
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Message[]>>({})
  const [events, setEvents] = useState<WSEvent[]>([])
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([])
  const [input, setInput] = useState('')
  const [botUrl, setBotUrl] = useState('http://localhost:5000/webhook')
  const [botRegistered, setBotRegistered] = useState(false)
  const [connected, setConnected] = useState(false)
  const [wsStatus, setWsStatus] = useState('Connecting...')
  const [showUserForm, setShowUserForm] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [userForm, setUserForm] = useState<UserForm>({ name: '', country: 'NG', dialCode: '+234', metadata: [] })
  const [loadingUser, setLoadingUser] = useState(false)
  const [loadingBot, setLoadingBot] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [rightTab, setRightTab] = useState<'events' | 'network'>('events')
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null)
  const [recordings, setRecordings] = useState<ConvkitRecording[]>([])
  const [isRecordingActive, setIsRecordingActive] = useState(false)
  const [recordingName, setRecordingName] = useState('')
  const [showRecordingInput, setShowRecordingInput] = useState(false)
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'recordings'>('chat')

  // Panel widths
  const [leftWidth, setLeftWidth] = useState(256)
  const [rightWidth, setRightWidth] = useState(320)

  // Server URLs come from /api/config at runtime, not from NEXT_PUBLIC_* build
  // args, so the same image works whatever ports it is published on. Empty
  // until that fetch settles, which gates the connect effect below.
  const [serverUrl, setServerUrl] = useState('')
  const [wsUrl, setWsUrl] = useState('')

  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const seenNetworkIds = useRef<Set<string>>(new Set())
  const sessionsRef = useRef<Record<string, Session>>({})
  const countryRef = useRef<HTMLDivElement>(null)

  const activeUser = users.find(u => u.id === activeUserId) ?? null
  const activeSession = activeUserId ? sessions[activeUserId] : null
  const activeMessages = activeUserId ? (messagesByUser[activeUserId] ?? []) : []
  const selectedCountry = COUNTRIES.find(c => c.code === userForm.country)

  const filteredCountries = countrySearch.trim() === ''
    ? COUNTRIES
    : COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dial.includes(countrySearch) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )

  const onLeftDrag = useDrag((delta) => {
    setLeftWidth(w => Math.max(180, Math.min(400, w + delta)))
  })

  const onRightDrag = useDrag((delta) => {
    setRightWidth(w => Math.max(220, Math.min(600, w - delta)))
  })

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        setServerUrl(cfg.serverUrl)
        setWsUrl(cfg.wsUrl)
      })
      .catch(() => {
        // Fall back to the local defaults if the config fetch fails
        setServerUrl('http://localhost:4000')
        setWsUrl('ws://localhost:4000/ws')
      })
  }, [])

  useEffect(() => {
    if (!wsUrl) return
    connectWS()
    fetchRecordings()
  }, [wsUrl])

  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function connectWS() {
    const socket = new WebSocket(wsUrl)
    socket.onopen = () => { setConnected(true); setWsStatus('Connected') }
    socket.onclose = () => {
      setConnected(false)
      setWsStatus('Reconnecting...')
      setTimeout(connectWS, 2000)
    }
    socket.onmessage = (e) => {
      let payload: WSEvent
      try { payload = JSON.parse(e.data) } catch { return }
      setEvents(prev => [payload, ...prev].slice(0, 100))

      if (payload.event === 'network.request') {
        const req = payload.data as NetworkRequest
        if (!req?.id) return
        if (seenNetworkIds.current.has(req.id)) return
        seenNetworkIds.current.add(req.id)
        setNetworkRequests(prev => [req, ...prev].slice(0, 100))
        setRightTab('network')
      }

      if (payload.event === 'user.updated') {
        const updatedUser = payload.data as User
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, metadata: updatedUser.metadata } : u))
      }

      if (payload.event === 'recording.started') {
        setIsRecordingActive(true)
      }
      if (payload.event === 'recording.stopped') {
        setIsRecordingActive(false)
        setShowRecordingInput(false)
        setRecordingName('')
        fetchRecordings()
      }
      if (payload.event === 'replay.started') {
        setReplayingId(payload.data?.recordingId ?? null)
      }
      if (payload.event === 'replay.completed' || payload.event === 'replay.error') {
        setReplayingId(null)
      }

      if (payload.event === 'message.sent' || payload.event === 'message.received') {
        const msg: Message = payload.data?.message
        if (!msg?.id) return
        if (seenIds.current.has(msg.id)) return
        seenIds.current.add(msg.id)
        const sessionId = payload.data?.sessionId
        const userId = Object.entries(sessionsRef.current).find(([, s]) => s.id === sessionId)?.[0]
        if (!userId) return
        setMessagesByUser(prev => ({ ...prev, [userId]: [...(prev[userId] ?? []), msg] }))
      }
    }
    ws.current = socket
  }

  function selectCountry(code: string, dial: string) {
    setUserForm(p => ({ ...p, country: code, dialCode: dial }))
    setCountryOpen(false)
    setCountrySearch('')
  }

  async function createUser() {
    if (!userForm.name.trim() || !phoneNumber.trim()) return
    setLoadingUser(true)
    try {
      const res = await fetch(`${serverUrl}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userForm.name,
          phone: `${userForm.dialCode}${phoneNumber}`,
          country: userForm.country,
          metadata: Object.fromEntries(
            userForm.metadata
              .filter(m => m.key.trim() !== '')
              .map(m => [m.key.trim(), m.value.trim()])
          )
        })
      })
      const data = await res.json()
      setUsers(prev => [...prev, data.user])
      setSessions(prev => ({ ...prev, [data.user.id]: data.session }))
      setMessagesByUser(prev => ({ ...prev, [data.user.id]: [] }))
      setActiveUserId(data.user.id)
      setShowUserForm(false)
      setUserForm({ name: '', country: 'NG', dialCode: '+234', metadata: [] })
      setPhoneNumber('')
      setCountrySearch('')
    } finally {
      setLoadingUser(false)
    }
  }

  async function registerBot() {
    setLoadingBot(true)
    try {
      await fetch(`${serverUrl}/api/v1/bots`, {
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
      await fetch(`${serverUrl}/api/v1/messages`, {
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
    const res = await fetch(`${serverUrl}/api/v1/sessions/${activeSession.id}/reset`, { method: 'POST' })
    if (res.ok) {
      setMessagesByUser(prev => ({ ...prev, [activeUserId]: [] }))
      seenIds.current.clear()
      seenNetworkIds.current.clear()
    }
  }

  async function fetchRecordings() {
    const res = await fetch(`${serverUrl}/api/v1/recordings`)
    const data = await res.json()
    setRecordings(data)
  }

  async function startRecording() {
    if (!activeSession || !recordingName.trim()) return
    await fetch(`${serverUrl}/api/v1/sessions/${activeSession.id}/record/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: recordingName.trim() })
    })
  }

  async function stopRecording() {
    if (!activeSession) return
    await fetch(`${serverUrl}/api/v1/sessions/${activeSession.id}/record/stop`, {
      method: 'POST'
    })
  }

  async function replayRecording(recordingId: string) {
    setReplayingId(recordingId)
    await fetch(`${serverUrl}/api/v1/recordings/${recordingId}/replay`, {
      method: 'POST'
    })
  }

  async function deleteRecording(recordingId: string) {
    await fetch(`${serverUrl}/api/v1/recordings/${recordingId}`, { method: 'DELETE' })
    fetchRecordings()
  }

  async function clickButton(buttonId: string, buttonTitle: string) {
    if (!activeUser) return
    await fetch(`${serverUrl}/api/v1/button`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUser.id, buttonId, buttonTitle })
    })
  }

  async function selectListItem(itemId: string, itemTitle: string) {
    if (!activeUser) return
    await fetch(`${serverUrl}/api/v1/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUser.id, itemId, itemTitle })
    })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function statusColor(status: number) {
    if (status === 0) return 'text-red-400'
    if (status < 300) return 'text-green-400'
    if (status < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 text-sm overflow-hidden font-mono select-none">

      {/* Left panel */}
      <div style={{ width: leftWidth }} className="shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Convkit</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? 'bg-green-950 text-green-400' : 'bg-yellow-950 text-yellow-400'}`}>
            {wsStatus}
          </span>
        </div>

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
            className={`w-full text-[11px] py-1.5 rounded transition-colors ${botRegistered ? 'bg-green-950 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'} disabled:opacity-50`}
          >
            {loadingBot ? 'Registering...' : botRegistered ? '✓ Bot registered' : 'Register bot'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Users</p>
            <button onClick={() => { setShowUserForm(v => !v); setCountryOpen(false) }} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
              {showUserForm ? 'Cancel' : '+ New'}
            </button>
          </div>

          {showUserForm && (
            <div className="mx-3 mb-3 bg-zinc-900 border border-zinc-700 rounded p-3 flex flex-col gap-2">
              <input
                placeholder="Name"
                value={userForm.name}
                onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
              />
              <div ref={countryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCountryOpen(v => !v)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 text-left flex items-center gap-1.5"
                >
                  <span>{selectedCountry?.flag}</span>
                  <span className="flex-1 truncate">{selectedCountry?.name}</span>
                  <span className="text-zinc-500">{userForm.dialCode}</span>
                  <span className="text-zinc-600">▾</span>
                </button>
                {countryOpen && (
                  <div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-700 rounded mt-0.5 z-50 flex flex-col">
                    <input
                      autoFocus
                      placeholder="Search country or code..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      className="bg-zinc-700 border-b border-zinc-600 px-2 py-1.5 text-[11px] text-zinc-200 outline-none placeholder-zinc-500 rounded-t"
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {filteredCountries.length === 0 && <p className="text-[10px] text-zinc-600 px-2 py-2">No results</p>}
                      {filteredCountries.map(c => (
                        <button key={c.code} onMouseDown={() => selectCountry(c.code, c.dial)} className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 flex items-center gap-1.5">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="text-zinc-500 shrink-0">{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-400 shrink-0 flex items-center gap-1">
                  <span>{selectedCountry?.flag}</span>
                  <span>{userForm.dialCode}</span>
                </div>
                <input
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">State / Metadata</p>
                  <button
                    type="button"
                    onClick={() => setUserForm(p => ({ ...p, metadata: [...p.metadata, { key: '', value: '' }] }))}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    + Add field
                  </button>
                </div>
                {userForm.metadata.length === 0 && (
                  <p className="text-[10px] text-zinc-600">No state set. Click + Add field to inject metadata into this user.</p>
                )}
                {userForm.metadata.map((field, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <input
                      placeholder="key"
                      value={field.key}
                      onChange={e => {
                        const updated = [...userForm.metadata]
                        updated[idx] = { ...updated[idx], key: e.target.value }
                        setUserForm(p => ({ ...p, metadata: updated }))
                      }}
                      className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
                    />
                    <span className="text-zinc-600 text-[11px]">:</span>
                    <input
                      placeholder="value"
                      value={field.value}
                      onChange={e => {
                        const updated = [...userForm.metadata]
                        updated[idx] = { ...updated[idx], value: e.target.value }
                        setUserForm(p => ({ ...p, metadata: updated }))
                      }}
                      className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setUserForm(p => ({ ...p, metadata: p.metadata.filter((_, i) => i !== idx) }))}
                      className="text-zinc-600 hover:text-red-400 text-[11px] transition-colors px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={createUser}
                disabled={loadingUser || !userForm.name.trim() || !phoneNumber.trim()}
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
            {users.map(user => {
              const country = COUNTRIES.find(c => c.code === user.country)
              return (
                <button key={user.id} onClick={() => setActiveUserId(user.id)}
                  className={`w-full text-left rounded p-2 transition-colors border ${activeUserId === user.id ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <p className="text-[11px] text-zinc-200 font-medium">{user.name}</p>
                  <p className="text-[10px] text-zinc-500">{user.phone}</p>
                  <p className="text-[10px] text-zinc-600">{country?.flag} {country?.name ?? user.country}</p>
                </button>
              )
            })}
          </div>
        </div>

        {activeSession && (
          <div className="p-4 border-t border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Session</p>
            <p className="text-[10px] text-zinc-600 break-all mb-2">{activeSession.id}</p>

            {/* Live metadata editor */}
            {activeUser && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">User State</p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeUser) return
                      const key = prompt('Key:')
                      if (!key) return
                      const value = prompt('Value:')
                      if (value === null) return
                      await fetch(`${serverUrl}/api/v1/users/${activeUser.id}/metadata`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ metadata: { [key]: value } })
                      })
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {Object.entries(activeUser.metadata ?? {}).length === 0 && (
                  <p className="text-[10px] text-zinc-600">No state.</p>
                )}
                {Object.entries(activeUser.metadata ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] text-zinc-400 truncate flex-1">{k}: <span className="text-zinc-300">{String(v)}</span></span>
                    <button
                      onClick={async () => {
                        await fetch(`${serverUrl}/api/v1/users/${activeUser.id}/metadata/${encodeURIComponent(k)}`, {
                          method: 'DELETE'
                        })
                      }}
                      className="text-zinc-600 hover:text-red-400 text-[10px] transition-colors shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={resetSession} className="w-full text-[11px] py-1.5 rounded bg-zinc-800 hover:bg-red-950 hover:text-red-400 text-zinc-400 transition-colors">
              Reset session
            </button>
          </div>
        )}
      </div>

      {/* Left resize handle */}
      <div
        onMouseDown={onLeftDrag}
        className="w-1 shrink-0 bg-zinc-800 hover:bg-zinc-600 cursor-col-resize transition-colors active:bg-zinc-500"
      />

      {/* Center — chat */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 shrink-0">
          <div className="flex gap-1 mr-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${activeTab === 'chat' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Chat
            </button>
            <button
              onClick={() => { setActiveTab('recordings'); fetchRecordings() }}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${activeTab === 'recordings' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Recordings {recordings.length > 0 && <span className="text-zinc-600 ml-1">{recordings.length}</span>}
            </button>
          </div>

          {activeTab === 'chat' && activeUser && (
            <span className="text-zinc-600 text-[11px] flex-1">
              — {activeUser.name} · {activeUser.phone} · {COUNTRIES.find(c => c.code === activeUser.country)?.flag}
            </span>
          )}

          {activeTab === 'chat' && activeSession && (
            <div className="ml-auto flex items-center gap-2">
              {isRecordingActive ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-red-950 text-red-400 hover:bg-red-900 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Stop
                </button>
              ) : showRecordingInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    placeholder="Recording name..."
                    value={recordingName}
                    onChange={e => setRecordingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') startRecording(); if (e.key === 'Escape') setShowRecordingInput(false) }}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600 w-36"
                  />
                  <button
                    onClick={startRecording}
                    disabled={!recordingName.trim()}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 transition-colors"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setShowRecordingInput(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRecordingInput(true)}
                  className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                >
                  ⏺ Record
                </button>
              )}
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
          <>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 select-text">
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
                  msg.direction === 'inbound' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}>
                  {msg.message.type === 'text' && <p className="whitespace-pre-wrap">{msg.message.text ?? ''}</p>}
                  {msg.message.type === 'button' && <p className="text-zinc-400 italic text-[11px]">Button: {msg.message.buttonTitle}</p>}
                  {msg.message.type === 'list' && msg.direction === 'inbound' && <p className="text-zinc-400 italic text-[11px]">Selected: {msg.message.itemTitle}</p>}
                  {msg.message.type === 'buttons' && (
                    <div>
                      <p className="whitespace-pre-wrap mb-2">{msg.message.text}</p>
                      <div className="flex flex-col gap-1">
                        {msg.message.buttons?.map(btn => (
                          <button key={btn.id} onClick={() => clickButton(btn.id, btn.title)}
                            className="w-full text-left px-3 py-1.5 rounded border border-zinc-600 hover:bg-zinc-700 text-[11px] text-zinc-200 transition-colors">
                            {btn.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.message.type === 'list' && msg.direction === 'outbound' && (
                    <div>
                      <p className="whitespace-pre-wrap mb-2">{msg.message.text}</p>
                      {msg.message.sections?.map((section, si) => (
                        <div key={si} className="mb-2">
                          {section.title && <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{section.title}</p>}
                          <div className="flex flex-col gap-1">
                            {section.items.map(item => (
                              <button key={item.id} onClick={() => selectListItem(item.id, item.title)}
                                className="w-full text-left px-3 py-1.5 rounded border border-zinc-600 hover:bg-zinc-700 transition-colors">
                                <p className="text-[11px] text-zinc-200">{item.title}</p>
                                {item.description && <p className="text-[10px] text-zinc-500">{item.description}</p>}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          </>
        )}

        {activeTab === 'recordings' && (
          <div className="flex-1 overflow-y-auto p-4">
            {recordings.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700">
                <p className="text-[11px]">No recordings yet.</p>
                <p className="text-[10px]">Switch to Chat, select a user, and click ⏺ Record to start capturing a conversation.</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {recordings.map(rec => (
                <div key={rec.id} className="bg-zinc-900 border border-zinc-800 rounded p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-zinc-200 font-medium">{rec.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => replayRecording(rec.id)}
                        disabled={replayingId === rec.id}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 transition-colors"
                      >
                        {replayingId === rec.id ? 'Replaying...' : '▶ Replay'}
                      </button>
                      <button
                        onClick={() => deleteRecording(rec.id)}
                        className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500">{rec.user.name} · {rec.user.phone}</p>
                  <p className="text-[10px] text-zinc-600">{rec.messages.length} messages · {new Date(rec.createdAt).toLocaleString()}</p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {rec.messages.slice(0, 5).map(msg => (
                      <p key={msg.id} className={`text-[10px] truncate ${msg.direction === 'inbound' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {msg.direction === 'inbound' ? '→' : '←'} {(msg.message as any).text ?? msg.message.type}
                      </p>
                    ))}
                    {rec.messages.length > 5 && (
                      <p className="text-[10px] text-zinc-700">+{rec.messages.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right resize handle */}
      <div
        onMouseDown={onRightDrag}
        className="w-1 shrink-0 bg-zinc-800 hover:bg-zinc-600 cursor-col-resize transition-colors active:bg-zinc-500"
      />

      {/* Right panel */}
      <div style={{ width: rightWidth }} className="shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden">

        {/* Tabs */}
        <div className="border-b border-zinc-800 flex shrink-0">
          <button
            onClick={() => setRightTab('events')}
            className={`flex-1 px-3 py-2 text-[11px] transition-colors ${rightTab === 'events' ? 'text-zinc-200 border-b border-zinc-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Events {events.length > 0 && <span className="ml-1 text-zinc-600">{events.length}</span>}
          </button>
          <button
            onClick={() => setRightTab('network')}
            className={`flex-1 px-3 py-2 text-[11px] transition-colors ${rightTab === 'network' ? 'text-zinc-200 border-b border-zinc-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Network {networkRequests.length > 0 && <span className="ml-1 text-zinc-600">{networkRequests.length}</span>}
          </button>
        </div>

        {/* Events tab */}
        {rightTab === 'events' && (
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {events.length === 0 && (
              <div className="p-3 text-[11px] text-zinc-600 leading-relaxed">
                <p className="text-zinc-500 mb-1">No events yet.</p>
                <p>Events appear here in real time as messages flow between the UI, server, and your bot.</p>
                <p className="mt-2">To see events:</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Register your bot</li>
                  <li>Create a user</li>
                  <li>Send a message</li>
                </ol>
              </div>
            )}
            {events.map((ev, i) => (
              <div key={i} className={`bg-zinc-900 border rounded p-2 ${ev.event === 'bot.error' ? 'border-red-800' : 'border-zinc-800'}`}>
                <p className={`text-[11px] mb-1 ${ev.event === 'bot.error' ? 'text-red-400' : 'text-green-400'}`}>{ev.event}</p>
                <pre className="text-zinc-500 text-[10px] whitespace-pre-wrap break-all">
                  {JSON.stringify(ev.data, null, 2).slice(0, 300)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Network tab */}
        {rightTab === 'network' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRequest ? (
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                <button onClick={() => setSelectedRequest(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 text-left">← Back</button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{selectedRequest.method}</span>
                  <span className={`text-[11px] font-medium ${statusColor(selectedRequest.status)}`}>{selectedRequest.status || 'ERR'}</span>
                  <span className="text-[10px] text-zinc-600">{selectedRequest.duration}ms</span>
                </div>

                <p className="text-[10px] text-zinc-500 break-all">{selectedRequest.url}</p>
                <p className="text-[10px] text-zinc-600">{formatTime(selectedRequest.timestamp)}</p>

                {selectedRequest.error && (
                  <div className="bg-red-950 border border-red-800 rounded p-2">
                    <p className="text-[10px] text-red-400">{selectedRequest.error}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Request</p>
                  <pre className="bg-zinc-900 border border-zinc-800 rounded p-2 text-[10px] text-zinc-400 whitespace-pre-wrap break-all overflow-auto max-h-48">
                    {JSON.stringify(selectedRequest.requestBody, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Response</p>
                  <pre className="bg-zinc-900 border border-zinc-800 rounded p-2 text-[10px] text-zinc-400 whitespace-pre-wrap break-all overflow-auto max-h-48">
                    {JSON.stringify(selectedRequest.responseBody, null, 2) ?? 'null'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {networkRequests.length === 0 && (
                  <div className="p-3 text-[11px] text-zinc-600 leading-relaxed">
                    <p className="text-zinc-500 mb-1">No requests yet.</p>
                    <p>Every webhook call Convkit makes to your bot appears here with status, duration, and full request/response payloads.</p>
                  </div>
                )}
                {networkRequests.map((req, i) => (
                  <button
                    key={`${req.id}-${i}`}
                    onClick={() => setSelectedRequest(req)}
                    className="w-full text-left px-3 py-2 border-b border-zinc-800 hover:bg-zinc-900 transition-colors flex items-center gap-2"
                  >
                    <span className="text-[10px] text-zinc-500">{req.method}</span>
                    <span className={`text-[11px] font-medium ${statusColor(req.status)}`}>{req.status || 'ERR'}</span>
                    <span className="text-[10px] text-zinc-600 flex-1 truncate">/webhook</span>
                    <span className="text-[10px] text-zinc-600 shrink-0">{req.duration}ms</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}