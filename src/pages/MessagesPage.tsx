import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore'
import { useAuthStore } from '@/store/authStore'
import { messageService, type ConversationItem, type MessageItem } from '@/services/messageService'
import { firestoreClient } from '@/services/firebaseClient'
import { formatRelativeTime } from '@/utils/orderStage'

/* ─────────────────────────────────────
   HOOKS
───────────────────────────────────── */
function useQueryParams() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function useIsMobileView() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', () => setTimeout(check, 120))
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  return isMobile
}

/* ─────────────────────────────────────
   AVATAR
───────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size]
  const palette = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
  ]
  const color = palette[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

/* ─────────────────────────────────────
   CONVERSATION LIST ITEM
───────────────────────────────────── */
function ConversationListItem({
  conversation,
  active,
  currentUserId,
  onClick,
}: {
  conversation: ConversationItem
  active: boolean
  currentUserId: string
  onClick: () => void
}) {
  const counterpart = (conversation.participantMeta || []).find((p) => p.userId !== currentUserId)
  const name = counterpart?.name || 'Unknown'
  const lastMsg = conversation.lastMessage || 'No messages yet'
  const time = conversation.updatedAt ? formatRelativeTime(conversation.updatedAt as any) : ''

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors relative
        ${active ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
    >
      {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text truncate">{name}</p>
          {time && <span className="text-[10px] text-muted-text shrink-0">{time}</span>}
        </div>
        <p className="text-xs text-muted-text truncate mt-0.5">{lastMsg}</p>
      </div>
      {/* Chevron indicator on mobile */}
      <svg className="w-4 h-4 text-gray-300 shrink-0 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

/* ─────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────── */
function MessageBubble({ message, mine }: { message: MessageItem; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 ${
          mine
            ? 'bg-primary text-white rounded-2xl rounded-br-md'
            : 'bg-gray-100 text-text rounded-2xl rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
        <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/60' : 'text-muted-text'}`}>
          {formatRelativeTime(message.createdAt as any)}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   EMPTY / LOADING STATES
───────────────────────────────────── */
function EmptyConversations() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863
               9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3
               12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-text">No conversations yet</p>
      <p className="text-xs text-muted-text mt-1 max-w-[200px]">
        Start a conversation from a product page or order.
      </p>
    </div>
  )
}

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-text">No messages yet</p>
      <p className="text-xs text-muted-text mt-1">Be the first to say something.</p>
    </div>
  )
}

function NoConversationSelected() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863
               9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3
               12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-base font-bold text-text">Pick a conversation</p>
      <p className="text-sm text-muted-text mt-1 max-w-[200px]">
        Select one from the list to start chatting.
      </p>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60dvh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-text">Loading messages…</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   SEARCH BAR
───────────────────────────────────── */
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations…"
        className="w-full rounded-xl border border-border bg-gray-50 pl-9 pr-4 py-2
                   text-sm placeholder:text-gray-400 outline-none
                   focus:border-primary focus:ring-2 focus:ring-primary/20
                   focus:bg-white transition-all"
      />
    </div>
  )
}

/* ─────────────────────────────────────
   MESSAGE INPUT BAR
───────────────────────────────────── */
function MessageInput({
  draft,
  sending,
  disabled,
  inputRef,
  onChange,
  onKeyDown,
  onSend,
}: {
  draft: string
  sending: boolean
  disabled: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSend: () => void
}) {
  return (
    <div className="px-3 sm:px-4 py-3 border-t border-border bg-white shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            disabled={disabled}
            className="w-full rounded-xl border border-border bg-gray-50 pl-4 py-2.5
                       text-sm placeholder:text-gray-400 outline-none pr-12 md:pr-4
                       focus:border-primary focus:ring-2 focus:ring-primary/20
                       focus:bg-white transition-all disabled:opacity-40"
          />
          {/* Inline send — visible on mobile, hidden on md+ */}
          <button
            onClick={onSend}
            disabled={disabled || !draft.trim() || sending}
            className="absolute right-1.5 top-1/2 -translate-y-1/2
                       p-2 rounded-lg bg-primary text-white md:hidden
                       disabled:opacity-30 active:scale-90 transition-all"
            aria-label="Send"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* Desktop send button */}
        <button
          onClick={onSend}
          disabled={disabled || !draft.trim() || sending}
          className="hidden md:flex items-center gap-2 rounded-xl bg-primary text-white
                     px-5 py-2.5 text-sm font-semibold shrink-0
                     hover:bg-primary/90 active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   CHAT HEADER
───────────────────────────────────── */
function ChatHeader({
  name,
  onBack,
  showBack,
}: {
  name: string
  onBack: () => void
  showBack: boolean
}) {
  return (
    <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center gap-3 bg-white shrink-0">
      {showBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-xl hover:bg-gray-100 text-gray-500
                     active:scale-95 transition-all"
          aria-label="Back to conversations"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate">{name}</p>
        <p className="text-[11px] text-green-600 font-medium">Online</p>
      </div>
      <button
        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
        aria-label="Options"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────
   MESSAGES AREA
───────────────────────────────────── */
function MessagesArea({
  messages,
  currentUserId,
  endRef,
  loading,
}: {
  messages: MessageItem[]
  currentUserId: string
  endRef: React.RefObject<HTMLDivElement>
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gray-50/40">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="max-w-[80%] animate-pulse">
              <div className="h-3 bg-gray-200 rounded mb-2" style={{ width: `${30 + i * 10}%` }} />
              <div className="h-3 bg-gray-200 rounded" style={{ width: `${20 + i * 15}%` }} />
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gray-50/40">
      {messages.length > 0 ? (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-text font-medium px-2">
              {formatRelativeTime(messages[0].createdAt as any)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} mine={msg.senderId === currentUserId} />
          ))}
          <div ref={endRef} />
        </>
      ) : (
        <EmptyMessages />
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════ */
function MessagesPage() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const params = useQueryParams()
  const isMobile = useIsMobileView()

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showChat, setShowChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus
  useEffect(() => {
    if (activeConversationId) {
      const t = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(t)
    }
  }, [activeConversationId])

  // Helper: merge server messages while preserving optimistic messages
  function mergePreserveOptimistic(existing: MessageItem[], server: MessageItem[] | undefined) {
    if (!server) return existing
    const optimistic = existing.filter(m => typeof m.id === 'string' && m.id.startsWith('optimistic-'))
    const result = [...server]

    for (const opt of optimistic) {
      const duplicate = server.some(s =>
        s.senderId === opt.senderId && s.body === opt.body && Math.abs(new Date((s.createdAt as any) || s.createdAt).getTime() - new Date(opt.createdAt as any).getTime()) < 5000
      )
      if (!duplicate) result.push(opt)
    }

    return result
  }

  // Auth + load conversations
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const conversationId = params.get('conversationId') || undefined
        const productId = params.get('productId') || undefined
        const orderId = params.get('orderId') || undefined
        const targetUserId = params.get('targetUserId') || undefined

        if (productId || orderId || targetUserId) {
          const started = await messageService.startConversation({ productId, orderId, targetUserId })
          if (mounted) {
            setActiveConversationId(started.id)
            setShowChat(true)
          }
        }

        const list = await messageService.getConversations()
        const items = list.items || []
        if (!mounted) return
        setConversations(items)

        if (conversationId && items.some((c) => c.id === conversationId)) {
          setActiveConversationId(conversationId)
          setShowChat(true)
          return
        }

        if (!activeConversationId && items.length > 0 && !productId && !orderId && !targetUserId) {
          if (!isMobile) setActiveConversationId(items[0].id)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, navigate, params])

  // Real-time messages
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return }
    let mounted = true

    setMessagesLoading(true)

    ;(async () => {
      try {
        const data = await messageService.getMessages(activeConversationId)
        if (mounted && data.items) setMessages(prev => mergePreserveOptimistic(prev, data.items))
      } catch (err) { console.error('messages eager fetch failed:', err) }
      finally { if (mounted) setMessagesLoading(false) }
    })()

    const q = query(
      collection(firestoreClient, 'messages'),
      where('conversationId', '==', activeConversationId),
      orderBy('createdAt', 'asc'),
    )

    let unsub = () => {}
    let pollInterval: number | null = null
    let fallbackTimer: number | null = null
    let snapshotReceived = false

    try {
      unsub = onSnapshot(
        q,
        (snap: QuerySnapshot<DocumentData>) => {
          if (!mounted) return
          snapshotReceived = true
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
          const serverMsgs = snap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as MessageItem))
          setMessages(prev => mergePreserveOptimistic(prev, serverMsgs))
          if (mounted) setMessagesLoading(false)
        },
        (err) => console.error('messages listener:', err),
      )
    } catch (err) {
      console.error('messages onSnapshot setup failed:', err)
    }

    fallbackTimer = window.setTimeout(() => {
      if (snapshotReceived) return
      pollInterval = window.setInterval(async () => {
        try {
          const data = await messageService.getMessages(activeConversationId)
          if (mounted && data.items?.length) setMessages(prev => mergePreserveOptimistic(prev, data.items))
        } catch { /* silent */ }
      }, 5000)
    }, 3000)

    return () => {
      mounted = false
      try { unsub() } catch { /* ignore */ }
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [activeConversationId])

  // Real-time conversations
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    let mounted = true

    const q = query(
      collection(firestoreClient, 'conversations'),
      where('participants', 'array-contains', user.id),
      orderBy('updatedAt', 'desc'),
    )

    let unsub = () => {}
    let pollInterval: number | null = null
    let fallbackTimer: number | null = null
    let snapshotReceived = false

    try {
      unsub = onSnapshot(
        q,
        (snap: QuerySnapshot<DocumentData>) => {
          if (!mounted) return
          snapshotReceived = true
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
          const updated = snap.docs.map(
            (doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as ConversationItem)
          )
          if (activeConversationId && !updated.find(c => c.id === activeConversationId)) {
            setActiveConversationId('')
            setMessages([])
            setShowChat(false)
          }
          setConversations(updated)
        },
        (err) => console.error('conversations listener:', err),
      )
    } catch (err) {
      console.error('conversations onSnapshot setup failed:', err)
    }

    fallbackTimer = window.setTimeout(() => {
      if (snapshotReceived) return
      pollInterval = window.setInterval(async () => {
        try {
          const list = await messageService.getConversations()
          if (mounted) setConversations(list.items || [])
        } catch { /* silent */ }
      }, 5000)
    }, 3000)

    return () => {
      mounted = false
      try { unsub() } catch { /* ignore */ }
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [isAuthenticated, user?.id])

  // Derived
  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const counterpartName = activeConversation
    ? ((activeConversation.participantMeta || []).find((p) => p.userId !== user?.id)?.name ?? 'Unknown')
    : ''

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => {
      const cp = (c.participantMeta || []).find((p) => p.userId !== user?.id)
      const name = cp?.name?.toLowerCase() ?? ''
      const lastMsg = c.lastMessage?.toLowerCase() ?? ''
      return name.includes(q) || lastMsg.includes(q)
    })
  }, [conversations, searchQuery, user?.id])

  // Actions
  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setDraft('')
    setShowChat(true)
  }, [])

  const goBack = useCallback(() => {
    setShowChat(false)
  }, [])

  const closeMessages = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(user?.role === 'seller' ? '/seller/shop' : '/')
  }, [navigate, user?.role])

  const sendMessage = useCallback(async () => {
    if (!draft.trim() || !activeConversationId || sending) return
    const text = draft.trim()
    setDraft('')

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage: MessageItem = {
      id: optimisticId,
      conversationId: activeConversationId,
      senderId: user?.id || '',
      body: text,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      setSending(true)
      const result = await messageService.sendMessage(activeConversationId, text)
      setMessages(prev =>
        prev.map(m => m.id === optimisticId
          ? ({ ...result, createdAt: result.createdAt || new Date() } as MessageItem)
          : m
        )
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }, [draft, activeConversationId, sending, user?.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }, [sendMessage])

  if (loading) return <PageLoader />

  /* ══════════════════════════════════════════════
     MOBILE LAYOUT — full-page swap
  ══════════════════════════════════════════════ */
  if (isMobile) {
    // Chat is open — full-screen chat with back button
    if (showChat && activeConversation) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
          {/* Header with back button */}
          <div className="px-3 py-3 border-b border-border flex items-center gap-3 bg-white shrink-0">
            <button
              onClick={closeMessages}
              className="p-2 -ml-1 rounded-xl hover:bg-gray-100 text-gray-500
                         active:scale-95 transition-all"
              aria-label="Close messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Avatar name={counterpartName || 'U'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text truncate">
                {counterpartName || 'Conversation'}
              </p>
              <p className="text-[11px] text-green-600 font-medium">Online</p>
            </div>
            <button
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <MessagesArea
            messages={messages}
            currentUserId={user?.id || ''}
            endRef={messagesEndRef}
            loading={messagesLoading}
          />

          {/* Input */}
          <MessageInput
            draft={draft}
            sending={sending}
            disabled={!activeConversationId}
            inputRef={inputRef}
            onChange={setDraft}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
          />
        </div>
      )
    }

    // Conversation list — full page
    return (
      <div className="min-h-[80dvh] animate-fade-in">
        {/* Page header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text">Messages</h1>
            <p className="text-xs text-muted-text mt-0.5">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={closeMessages}
            className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-white text-gray-500 hover:text-text hover:border-gray-300 active:scale-95 transition-all"
            aria-label="Close messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {conversations.length > 2 && (
          <div className="px-4 pb-3">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        )}

        <div className="divide-y divide-border/40 border-t border-border">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                active={false}
                currentUserId={user?.id || ''}
                onClick={() => selectConversation(c.id)}
              />
            ))
          ) : searchQuery ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-text">No results for "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')}
                className="text-xs text-primary font-medium mt-2 hover:underline">
                Clear
              </button>
            </div>
          ) : (
            <EmptyConversations />
          )}
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════
     DESKTOP / TABLET — side-by-side split
  ══════════════════════════════════════════════ */
  return (
    <div className="max-w-6xl mx-auto px-4 animate-fade-in">
      {/* Page title */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Messages</h1>
          <p className="text-sm text-muted-text mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={closeMessages}
          className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-white text-gray-500 hover:text-text hover:border-gray-300 active:scale-95 transition-all"
          aria-label="Close messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Split layout */}
      <div
        className="grid rounded-2xl overflow-hidden border border-border bg-white"
        style={{
          gridTemplateColumns: '300px 1fr',
          height: 'calc(100dvh - 180px)',
          minHeight: '500px',
        }}
      >
        {/* Left — conversation list */}
        <div className="border-r border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-white shrink-0 space-y-2">
            <h2 className="font-bold text-text text-sm">
              Conversations{' '}
              <span className="font-normal text-muted-text text-xs">({conversations.length})</span>
            </h2>
            {conversations.length > 2 && (
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  active={activeConversationId === c.id}
                  currentUserId={user?.id || ''}
                  onClick={() => selectConversation(c.id)}
                />
              ))
            ) : searchQuery ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-text">No results for "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-medium mt-2 hover:underline">
                  Clear
                </button>
              </div>
            ) : (
              <EmptyConversations />
            )}
          </div>
        </div>

        {/* Right — chat */}
        <div className="flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              <ChatHeader
                name={counterpartName}
                showBack={false}
                onBack={goBack}
              />
              <MessagesArea
                messages={messages}
                currentUserId={user?.id || ''}
                endRef={messagesEndRef}
                loading={messagesLoading}
              />
              <MessageInput
                draft={draft}
                sending={sending}
                disabled={!activeConversationId}
                inputRef={inputRef}
                onChange={setDraft}
                onKeyDown={handleKeyDown}
                onSend={sendMessage}
              />
            </>
          ) : (
            <NoConversationSelected />
          )}
        </div>
      </div>
    </div>
  )
}

export default MessagesPage