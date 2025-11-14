"use client"

import { useState, useEffect } from "react"
import { MessageCircle, User, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

interface Message {
  id: string
  subject: string
  content: string
  created_at: string
  is_read: boolean
  sender_id: string
  recipient_id: string
  conversation_id?: string
  sender?: {
    full_name?: string
    nickname?: string
    profile_photo_url?: string
  }
}

interface Conversation {
  id: string
  other_user: {
    id: string
    name: string
    profile_photo_url?: string
  }
  last_message: {
    content: string
    created_at: string
    is_read: boolean
    sender_id: string
  }
  unread_count: number
}

interface MessageIconProps {
  user: any
}

export function MessageIcon({ user }: MessageIconProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Debug: Log user prop changes
  useEffect(() => {
    console.log('[MESSAGE-ICON] User prop changed:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userType: typeof user,
      userKeys: user ? Object.keys(user) : []
    })
  }, [user])

  // Debug: Log unread count changes
  useEffect(() => {
    console.log('[MESSAGE-ICON] Unread count changed to:', unreadCount)
  }, [unreadCount])

  useEffect(() => {
    console.log('[MESSAGE-ICON] useEffect triggered, user?.id:', user?.id, 'pathname:', pathname)

    // Don't fetch on messages page - it has its own fetch
    if (pathname?.startsWith('/messages')) {
      console.log('[MESSAGE-ICON] ⏭️  Skipping fetch on messages page')
      return
    }

    if (user?.id) {
      console.log('[MESSAGE-ICON] ✅ User has ID, calling fetchConversations')
      fetchConversations()

      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel('messages_channel')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
          () => {
            console.log('[MESSAGE-ICON] Real-time update: New message received')
            fetchConversations()
          }
        )
        .subscribe()

      // Listen for message-sent events from floating modal
      const handleMessageSent = (e: any) => {
        console.log('[MESSAGE-ICON] ✅ Message sent event received:', e.detail)
        console.log('[MESSAGE-ICON] Current user:', user.id)
        console.log('[MESSAGE-ICON] Refreshing conversations now...')
        fetchConversations()
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('message-sent', handleMessageSent)
        console.log('[MESSAGE-ICON] ✅ Event listener registered for message-sent')
      }

      return () => {
        subscription.unsubscribe()
        if (typeof window !== 'undefined') {
          window.removeEventListener('message-sent', handleMessageSent)
        }
      }
    } else {
      console.log('[MESSAGE-ICON] ❌ No user.id, skipping fetchConversations')
    }
  }, [user?.id, pathname])

  const fetchConversations = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      console.log('[MESSAGE-ICON] Fetching conversations for user:', user.id)

      // Add timeout protection - reduced to 5 seconds for faster response
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('[MESSAGE-ICON] Fetch aborted after 5 seconds (expected for new users)')
      }, 5000)

      // Fetch recent messages where user is sender or recipient (limit to last 100 for performance)
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id,
          subject,
          content,
          created_at,
          is_read,
          sender_id,
          recipient_id,
          conversation_id
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) {
        console.log('[MESSAGE-ICON] Error fetching messages (normal for new users):', error.message)
        // Don't throw - fail gracefully for new users
        setConversations([])
        setUnreadCount(0)
        setLoading(false)
        return
      }

      console.log('[MESSAGE-ICON] Fetched', messages?.length || 0, 'messages')

      // New users with no messages - exit early
      if (!messages || messages.length === 0) {
        console.log('[MESSAGE-ICON] No messages found - new user')
        setConversations([])
        setUnreadCount(0)
        setLoading(false)
        return
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, {
        messages: typeof messages,
        other_user_id: string
      }>()

      for (const message of messages || []) {
        const other_user_id = message.sender_id === user.id ? message.recipient_id : message.sender_id

        if (!conversationMap.has(other_user_id)) {
          conversationMap.set(other_user_id, {
            messages: [],
            other_user_id
          })
        }

        conversationMap.get(other_user_id)!.messages.push(message)
      }

      // OPTIMIZATION: Batch fetch all user IDs at once instead of one by one (fixes N+1 query problem)
      const userIds = Array.from(conversationMap.keys()).filter(id => id && id !== 'undefined' && id !== 'null')

      if (userIds.length === 0) {
        setConversations([])
        setUnreadCount(0)
        console.log('[MESSAGE-ICON] No valid user IDs found')
        return
      }

      console.log('[MESSAGE-ICON] Batch fetching', userIds.length, 'users')

      // Fetch all users at once (1 query instead of N queries)
      const { data: users } = await supabase
        .from("users")
        .select("id, user_type, full_name, nickname, profile_photo_url, email")
        .in("id", userIds)

      const usersMap = new Map(users?.map(u => [u.id, u]) || [])
      console.log('[MESSAGE-ICON] Fetched', usersMap.size, 'user records')

      // Fetch all professional profiles at once (1 query instead of N queries)
      const professionalIds = users?.filter(u => u.user_type === 'professional').map(u => u.id) || []
      const { data: professionalProfiles } = professionalIds.length > 0
        ? await supabase
            .from('professional_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', professionalIds)
        : { data: [] }

      const proProfilesMap = new Map(professionalProfiles?.map(p => [p.user_id, p]) || [])
      console.log('[MESSAGE-ICON] Fetched', proProfilesMap.size, 'professional profiles')

      // Fetch all company profiles at once (1 query instead of N queries)
      const companyIds = users?.filter(u => u.user_type === 'company').map(u => u.id) || []
      const { data: companyProfiles } = companyIds.length > 0
        ? await supabase
            .from('company_profiles')
            .select('user_id, company_name, logo_url')
            .in('user_id', companyIds)
        : { data: [] }

      const compProfilesMap = new Map(companyProfiles?.map(c => [c.user_id, c]) || [])
      console.log('[MESSAGE-ICON] Fetched', compProfilesMap.size, 'company profiles')

      // Now process all conversations with cached data (no more queries)
      const conversationsData: Conversation[] = []
      let totalUnread = 0

      for (const [otherUserId, convData] of conversationMap) {
        const otherUser = usersMap.get(otherUserId)
        if (!otherUser) {
          // User may have deleted their account - skip this conversation
          continue
        }

        let displayName = otherUser.nickname || otherUser.full_name || otherUser.email || 'Unknown User'
        let photoUrl = otherUser.profile_photo_url

        // Get profile-specific data from cached maps
        if (otherUser.user_type === 'professional') {
          const profData = proProfilesMap.get(otherUserId)
          if (profData) {
            const fullName = [profData.first_name, profData.last_name].filter(Boolean).join(' ')
            displayName = fullName || displayName
            photoUrl = profData.profile_photo_url || photoUrl
          }
        } else if (otherUser.user_type === 'company') {
          const compData = compProfilesMap.get(otherUserId)
          if (compData) {
            displayName = compData.company_name || displayName
            photoUrl = compData.logo_url || photoUrl
          }
        }

        const lastMessage = convData.messages[0] // Most recent message
        const unreadMessages = convData.messages.filter(
          msg => msg.recipient_id === user.id && !msg.is_read
        )
        const unreadCount = unreadMessages.length

        totalUnread += unreadCount

        conversationsData.push({
          id: otherUserId,
          other_user: {
            id: otherUserId,
            name: displayName,
            profile_photo_url: photoUrl
          },
          last_message: {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            is_read: lastMessage.is_read,
            sender_id: lastMessage.sender_id
          },
          unread_count: unreadCount
        })
      }

      // Sort by last message time
      conversationsData.sort((a, b) =>
        new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
      )

      setConversations(conversationsData)
      setUnreadCount(totalUnread)
      console.log('[MESSAGE-ICON] Set', conversationsData.length, 'conversations with', totalUnread, 'unread')
      console.log('[MESSAGE-ICON] Conversations data:', conversationsData.map(c => ({
        id: c.id,
        name: c.other_user.name,
        unread: c.unread_count,
        lastMessage: c.last_message.content.substring(0, 30)
      })))
      console.log('[MESSAGE-ICON] Unread count updated to:', totalUnread)
    } catch (error: any) {
      // Gracefully handle errors for new users
      if (error?.name === 'AbortError') {
        console.log('[MESSAGE-ICON] Request timed out - this is normal for new users with no messages')
      } else {
        console.error("[MESSAGE-ICON] Error fetching conversations:", error)
      }
      // Clear conversations on error to show clean state for new users
      setConversations([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const handleConversationClick = (otherUserId: string) => {
    setIsOpen(false)
    router.push(`/messages?with=${otherUserId}`)
  }

  if (!user) {
    console.log('[MESSAGE-ICON] No user, not rendering')
    return null
  }

  console.log('[MESSAGE-ICON] Rendering with unreadCount:', unreadCount, 'conversations:', conversations.length)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => {
          console.log('[MESSAGE-ICON] Button clicked, current unread:', unreadCount)
          setIsOpen(!isOpen)
        }}
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs min-w-[20px]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Messages Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Messages</h3>
                  <p className="text-xs text-gray-500">
                    {conversations.length} conversations, {unreadCount} unread
                  </p>
                  <p className="text-xs text-gray-400">
                    User: {user?.id ? user.id.substring(0, 8) : 'Not set'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      console.log('[MESSAGE-ICON] Manual refresh triggered, user:', user)
                      fetchConversations()
                    }}
                    title="Refresh"
                  >
                    🔄
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/messages')
                    }}
                  >
                    See all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation!</p>
                </div>
              ) : (
                <div className="py-2">
                  {conversations.slice(0, 8).map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-start p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleConversationClick(conversation.other_user.id)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        {conversation.other_user.profile_photo_url ? (
                          <AvatarImage src={conversation.other_user.profile_photo_url} />
                        ) : null}
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">
                            {conversation.other_user.name}
                          </p>
                          <div className="flex items-center gap-1">
                            {conversation.unread_count > 0 && (
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.last_message.created_at)}
                            </span>
                          </div>
                        </div>

                        <p className={`text-sm text-muted-foreground line-clamp-2 ${
                          conversation.unread_count > 0 && conversation.last_message.sender_id !== user.id
                            ? 'font-medium text-gray-900'
                            : ''
                        }`}>
                          {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                          {conversation.last_message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {conversations.length > 8 && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/messages')
                  }}
                >
                  View all {conversations.length} conversations
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}