import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, where, type DocumentData, type QueryDocumentSnapshot, type QuerySnapshot } from 'firebase/firestore'
import { useAuthStore } from '@/store/authStore'
import { messageService, ConversationItem, MessageItem } from '@/services/messageService'
import { firestoreClient } from '@/services/firebaseClient'
import { formatRelativeTime } from '@/utils/orderStage'

function useQueryParams() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function MessagesPage() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const params = useQueryParams()

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    ;(async () => {
      try {
        setLoading(true)

        const productId = params.get('productId') || undefined
        const orderId = params.get('orderId') || undefined
        const targetUserId = params.get('targetUserId') || undefined
        if (productId || orderId || targetUserId) {
          const started = await messageService.startConversation({ productId, orderId, targetUserId })
          setActiveConversationId(started.id)
        }

        const list = await messageService.getConversations()
        const items = list.items || []
        setConversations(items)
        if (!activeConversationId && items.length > 0) {
          setActiveConversationId(items[0].id)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated, user, navigate, params])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    const q = query(
      collection(firestoreClient, 'messages'),
      where('conversationId', '==', activeConversationId),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as MessageItem)
      setMessages(items)
    })

    return () => unsubscribe()
  }, [activeConversationId])

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  const sendMessage = async () => {
    if (!draft.trim() || !activeConversationId) return
    await messageService.sendMessage(activeConversationId, draft.trim())
    setDraft('')
  }

  if (loading) return <div className="p-6">Loading messages...</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[70dvh]">
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-bold text-text">Conversations</h2>
        </div>
        <div className="divide-y divide-border/60 max-h-[70dvh] overflow-y-auto">
          {conversations.map((conversation) => {
            const counterpart = (conversation.participantMeta || []).find((p) => p.userId !== user?.id)
            return (
              <button
                key={conversation.id}
                onClick={() => setActiveConversationId(conversation.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${activeConversationId === conversation.id ? 'bg-primary/5' : ''}`}
              >
                <p className="font-semibold text-sm text-text truncate">{counterpart?.name || 'Conversation'}</p>
                <p className="text-xs text-muted-text truncate mt-0.5">{conversation.lastMessage || 'No messages yet'}</p>
              </button>
            )
          })}
          {conversations.length === 0 && <p className="px-4 py-6 text-sm text-muted-text">No conversations yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white flex flex-col min-h-[70dvh]">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-bold text-text">{activeConversation ? ((activeConversation.participantMeta || []).find((p) => p.userId !== user?.id)?.name || 'Conversation') : 'Select a conversation'}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => {
            const mine = message.senderId === user?.id
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary text-white' : 'bg-gray-100 text-text'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/80' : 'text-muted-text'}`}>
                    {formatRelativeTime(message.createdAt as any)}
                  </p>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && <p className="text-sm text-muted-text">No messages yet.</p>}
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' ? void sendMessage() : undefined}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm"
            disabled={!activeConversationId}
          />
          <button onClick={sendMessage} disabled={!activeConversationId || !draft.trim()} className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessagesPage
