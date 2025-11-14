"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, User } from "lucide-react"
import { createClient } from "@/lib/client"

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  recipient_id: string
  is_read: boolean
  conversation_id?: string
}

export default function ConversationPage() {
  console.log('[CONVERSATION] Component rendering - TOP LEVEL')

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const otherUserId = params.id as string

  console.log('[CONVERSATION] Params:', params, 'otherUserId:', otherUserId)

  const [user, setUser] = useState<any>(null)
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | undefined>(undefined)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchConversation()
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversation = async () => {
    console.log('[CONVERSATION] fetchConversation called')
    try {
      console.log('[CONVERSATION] Step 1: Getting session...')
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[CONVERSATION] Step 2: Session retrieved:', !!session)
      const currentUser = session?.user
      console.log('[CONVERSATION] Step 3: Current user:', currentUser?.id)

      if (!currentUser) {
        console.log('[CONVERSATION] No user found, redirecting to login')
        router.push('/login')
        return
      }

      setUser(currentUser)
      console.log('[CONVERSATION] Step 4: User state set')

      // Fetch current user's profile photo
      console.log('[CONVERSATION] Step 5: Fetching current user data...')
      const { data: currentUserData, error: currentUserError } = await supabase
        .from("users")
        .select("user_type, profile_photo_url")
        .eq("id", currentUser.id)
        .single()

      console.log('[CONVERSATION] Step 6: Current user data retrieved:', !!currentUserData, 'error:', currentUserError)

      if (currentUserData) {
        let currentPhoto = currentUserData.profile_photo_url
        console.log('[CONVERSATION] Step 7: Current user type:', currentUserData.user_type)

        // Get profile-specific photo
        if (currentUserData.user_type === 'professional') {
          console.log('[CONVERSATION] Step 8a: Fetching professional profile photo...')
          const { data: profData } = await supabase
            .from('professional_profiles')
            .select('profile_photo_url')
            .eq('user_id', currentUser.id)
            .maybeSingle()

          console.log('[CONVERSATION] Step 8b: Professional photo retrieved:', !!profData?.profile_photo_url)
          if (profData?.profile_photo_url) {
            currentPhoto = profData.profile_photo_url
          }
        } else if (currentUserData.user_type === 'company') {
          console.log('[CONVERSATION] Step 8a: Fetching company logo...')
          const { data: compData } = await supabase
            .from('company_profiles')
            .select('logo_url')
            .eq('user_id', currentUser.id)
            .maybeSingle()

          console.log('[CONVERSATION] Step 8b: Company logo retrieved:', !!compData?.logo_url)
          if (compData?.logo_url) {
            currentPhoto = compData.logo_url
          }
        }

        setCurrentUserPhoto(currentPhoto)
        console.log('[CONVERSATION] Step 9: Current user photo set')
      }

      // Fetch other user's info
      console.log('[CONVERSATION] Step 10: Fetching other user data for ID:', otherUserId)
      const { data: userData, error: userDataError } = await supabase
        .from("users")
        .select("user_type, full_name, nickname, profile_photo_url, email")
        .eq("id", otherUserId)
        .single()

      console.log('[CONVERSATION] Step 11: Other user data retrieved:', !!userData, 'error:', userDataError)

      if (userData) {
        let displayName = userData.nickname || userData.full_name || userData.email || 'Unknown User'
        let photoUrl = userData.profile_photo_url
        console.log('[CONVERSATION] Step 12: Other user type:', userData.user_type)

        // Get profile-specific data
        if (userData.user_type === 'professional') {
          console.log('[CONVERSATION] Step 13a: Fetching professional profile...')
          const { data: profData } = await supabase
            .from('professional_profiles')
            .select('first_name, last_name, profile_photo_url')
            .eq('user_id', otherUserId)
            .maybeSingle()

          console.log('[CONVERSATION] Step 13b: Professional profile retrieved:', !!profData)
          if (profData) {
            const fullName = [profData.first_name, profData.last_name].filter(Boolean).join(' ')
            displayName = fullName || displayName
            photoUrl = profData.profile_photo_url || photoUrl
          }
        } else if (userData.user_type === 'company') {
          console.log('[CONVERSATION] Step 13a: Fetching company profile...')
          const { data: compData } = await supabase
            .from('company_profiles')
            .select('company_name, logo_url')
            .eq('user_id', otherUserId)
            .maybeSingle()

          console.log('[CONVERSATION] Step 13b: Company profile retrieved:', !!compData)
          if (compData) {
            displayName = compData.company_name || displayName
            photoUrl = compData.logo_url || photoUrl
          }
        }

        setOtherUser({
          id: otherUserId,
          name: displayName,
          profile_photo_url: photoUrl
        })
        console.log('[CONVERSATION] Step 14: Other user state set:', displayName)
      }

      // Fetch all messages between these two users
      console.log('[CONVERSATION] Step 15: Fetching messages...')
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true })

      console.log('[CONVERSATION] Step 16: Messages retrieved:', messagesData?.length || 0, 'error:', error)

      if (error) throw error

      setMessages(messagesData || [])
      console.log('[CONVERSATION] Step 17: Messages state set')

      // Mark unread messages as read
      const unreadMessageIds = messagesData
        ?.filter(msg => msg.recipient_id === currentUser.id && !msg.is_read)
        .map(msg => msg.id) || []

      console.log('[CONVERSATION] Step 18: Unread messages to mark:', unreadMessageIds.length)

      if (unreadMessageIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadMessageIds)
        console.log('[CONVERSATION] Step 19: Unread messages marked as read')
      }

      console.log('[CONVERSATION] Step 20: Setting loading to false')
      setLoading(false)
      console.log('[CONVERSATION] Step 21: fetchConversation completed successfully')
    } catch (error) {
      console.error("[CONVERSATION] Error caught:", error)
      console.error("[CONVERSATION] Error type:", typeof error)
      console.error("[CONVERSATION] Error details:", JSON.stringify(error, null, 2))
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      // Get or create conversation_id from existing messages
      let conversationId = messages.length > 0 ? messages[0].conversation_id : null

      // If no existing conversation, create a new conversation_id
      if (!conversationId) {
        conversationId = crypto.randomUUID()
      }

      console.log('[CONVERSATION] Sending message with conversation_id:', conversationId)

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: otherUserId,
          subject: messages.length > 0 ? "Reply" : "New Message",
          content: newMessage.trim(),
          conversation_id: conversationId,
          message_type: "direct",
          job_id: null,
          is_read: false,
          share_personal_info: false
        })

      if (error) {
        console.error('[CONVERSATION] Insert error CODE:', error.code)
        console.error('[CONVERSATION] Insert error MESSAGE:', error.message)
        console.error('[CONVERSATION] Insert error DETAILS:', error.details)
        console.error('[CONVERSATION] Insert error HINT:', error.hint)
        console.error('[CONVERSATION] Full error:', error)
        throw error
      }

      // Add message to local state
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        sender_id: user.id,
        recipient_id: otherUserId,
        is_read: false,
        conversation_id: conversationId
      }

      setMessages(prev => [...prev, tempMessage])
      setNewMessage("")

      // Refresh to get actual message from DB
      setTimeout(() => fetchConversation(), 500)
    } catch (error) {
      console.error("[CONVERSATION] Error sending:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading conversation...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/messages')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.profile_photo_url} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">{otherUser?.name || 'Unknown User'}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isSent = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={isSent ? currentUserPhoto : otherUser?.profile_photo_url}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isSent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  )
}
