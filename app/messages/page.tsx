"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Clock, User, ArrowLeft, Trash2, Star } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { RateCompanyModal } from "@/components/rate-company-modal"

interface Conversation {
  id: string // conversation partner's user_id
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

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<"professional" | "company" | "homeowner" | "contractor" | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedUserToRate, setSelectedUserToRate] = useState<{userId: string, name: string} | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      console.log("[MESSAGES] Starting to fetch conversations...")

      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user

      console.log("[MESSAGES] User from session:", currentUser?.id)

      if (!currentUser) {
        console.log("[MESSAGES] No user found")
        setError("Please log in to view messages")
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Get user type
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", currentUser.id)
        .single()

      if (userData) {
        setUserType(userData.user_type)
      }

      // Fetch all messages involving this user
      const { data: messages, error: messagesError } = await supabase
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
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })

      if (messagesError) {
        console.error("[MESSAGES] Error fetching messages:", messagesError)
        throw messagesError
      }

      console.log("[MESSAGES] Fetched", messages?.length || 0, "messages")

      // Group messages by conversation partner
      const conversationMap = new Map<string, {
        messages: typeof messages,
        other_user_id: string
      }>()

      for (const message of messages || []) {
        const other_user_id = message.sender_id === currentUser.id
          ? message.recipient_id
          : message.sender_id

        if (!conversationMap.has(other_user_id)) {
          conversationMap.set(other_user_id, {
            messages: [],
            other_user_id
          })
        }

        conversationMap.get(other_user_id)!.messages.push(message)
      }

      // Build conversations array
      const conversationsData: Conversation[] = []

      for (const [otherUserId, convData] of conversationMap) {
        if (!otherUserId || otherUserId === 'undefined' || otherUserId === 'null') {
          continue
        }

        // Get user info
        const { data: otherUser } = await supabase
          .from("users")
          .select("user_type, full_name, nickname, profile_photo_url, email")
          .eq("id", otherUserId)
          .maybeSingle()

        if (otherUser) {
          let displayName = otherUser.nickname || otherUser.full_name || otherUser.email || 'Unknown User'
          let photoUrl = otherUser.profile_photo_url

          // Get profile-specific data
          if (otherUser.user_type === 'professional') {
            const { data: profData } = await supabase
              .from('professional_profiles')
              .select('first_name, last_name, profile_photo_url')
              .eq('user_id', otherUserId)
              .maybeSingle()

            if (profData) {
              const fullName = [profData.first_name, profData.last_name].filter(Boolean).join(' ')
              displayName = fullName || displayName
              photoUrl = profData.profile_photo_url || photoUrl
            }
          } else if (otherUser.user_type === 'company') {
            const { data: compData } = await supabase
              .from('company_profiles')
              .select('company_name, logo_url')
              .eq('user_id', otherUserId)
              .maybeSingle()

            if (compData) {
              displayName = compData.company_name || displayName
              photoUrl = compData.logo_url || photoUrl
            }
          } else if (otherUser.user_type === 'homeowner') {
            const { data: homeownerData } = await supabase
              .from('homeowner_profiles')
              .select('first_name, last_name, profile_photo_url')
              .eq('user_id', otherUserId)
              .maybeSingle()

            if (homeownerData) {
              const fullName = [homeownerData.first_name, homeownerData.last_name].filter(Boolean).join(' ')
              displayName = fullName || displayName
              photoUrl = homeownerData.profile_photo_url || photoUrl
            }
          } else if (otherUser.user_type === 'contractor') {
            const { data: contractorData } = await supabase
              .from('contractor_profiles')
              .select('company_name, profile_photo_url')
              .eq('user_id', otherUserId)
              .maybeSingle()

            if (contractorData) {
              displayName = contractorData.company_name || displayName
              photoUrl = contractorData.profile_photo_url || photoUrl
            }
          }

          const lastMessage = convData.messages[0]
          const unreadMessages = convData.messages.filter(
            msg => msg.recipient_id === currentUser.id && !msg.is_read
          )

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
            unread_count: unreadMessages.length
          })
        }
      }

      // Sort by most recent
      conversationsData.sort((a, b) =>
        new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
      )

      setConversations(conversationsData)
      console.log("[MESSAGES] Set", conversationsData.length, "conversations")
    } catch (error) {
      console.error("[MESSAGES] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to load conversations")
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
    router.push(`/messages/${otherUserId}`)
  }

  const handleDeleteConversation = async (otherUserId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening conversation

    if (!confirm("Delete this conversation? This cannot be undone.")) {
      return
    }

    try {
      // Delete all messages between these two users
      const { error } = await supabase
        .from("messages")
        .delete()
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)

      if (error) throw error

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== otherUserId))
    } catch (error) {
      console.error("[MESSAGES] Error deleting conversation:", error)
      alert("Failed to delete conversation")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading conversations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={
            userType === "professional" ? "/dashboard/professional" :
            userType === "company" ? "/dashboard/company" :
            userType === "homeowner" ? "/dashboard/homeowner" :
            userType === "contractor" ? "/dashboard/contractor" :
            "/"
          }>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
              <p>Start messaging to see your conversations here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    conversation.unread_count > 0 ? "bg-blue-50 border-blue-200" : ""
                  }`}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={conversation.other_user.profile_photo_url} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium text-sm ${conversation.unread_count > 0 ? 'font-bold' : ''}`}>
                        {conversation.other_user.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conversation.last_message.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm text-muted-foreground line-clamp-1 ${
                      conversation.unread_count > 0 && conversation.last_message.sender_id !== user.id
                        ? 'font-medium text-gray-900'
                        : ''
                    }`}>
                      {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                      {conversation.last_message.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedUserToRate({
                          userId: conversation.other_user.id,
                          name: conversation.other_user.name
                        })
                        setRatingModalOpen(true)
                      }}
                      title="Rate this user"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Modal */}
      {selectedUserToRate && (
        <RateCompanyModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          companyUserId={selectedUserToRate.userId}
          companyName={selectedUserToRate.name}
        />
      )}
    </div>
  )
}
