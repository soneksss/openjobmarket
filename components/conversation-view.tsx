"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, User, Shield, Info, Ban, Flag, MoreVertical, Trash2 } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import ReportUserModal from "./report-user-modal"
import BlockUserModal from "./block-user-modal"
import ReviewSubmissionModal from "./review-submission-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Message {
  id: string
  subject: string
  content: string
  created_at: string
  is_read: boolean
  sender_id: string
  recipient_id: string
  job_id?: string
  conversation_id?: string
  sender?: {
    full_name?: string
    nickname?: string
    profile_photo_url?: string
  }
  recipient?: {
    full_name?: string
    nickname?: string
    profile_photo_url?: string
  }
  share_personal_info?: boolean
}

interface ConversationViewProps {
  conversationId: string
  userId: string
  userType: "professional" | "company"
}

export default function ConversationView({ conversationId, userId, userType }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [sharePersonalInfo, setSharePersonalInfo] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [otherUserId, setOtherUserId] = useState<string>("")
  const [otherUserName, setOtherUserName] = useState<string>("")
  const [recipientFromUrl, setRecipientFromUrl] = useState<string | null>(null)
  const [recipientNameFromUrl, setRecipientNameFromUrl] = useState<string | null>(null)
  const [canReview, setCanReview] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Extract recipient info from URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const recipient = params.get('recipient')
      const name = params.get('name')

      if (recipient) {
        // New conversation - skip database query entirely
        console.log('[CONVERSATION] New conversation detected with recipient:', recipient)
        setRecipientFromUrl(recipient)
        setOtherUserId(recipient)
        setMessages([]) // Empty conversation
        setLoading(false) // Stop loading immediately

        if (name) {
          setRecipientNameFromUrl(name)
          setOtherUserName(name)
          console.log('[CONVERSATION] Recipient name set:', name)
        }

        console.log('[CONVERSATION] New conversation ready for messaging')
        return // Don't call fetchConversation for new conversations
      }
    }

    // Only fetch if no recipient param (existing conversation)
    console.log('[CONVERSATION] Existing conversation, fetching messages')
    fetchConversation()
  }, [conversationId])

  const fetchConversation = async () => {
    console.log('[CONVERSATION] Starting to fetch conversation:', conversationId)
    try {
      setError(null)

      // Fetch messages with timeout protection
      console.log('[CONVERSATION] Fetching messages...')

      let messagesData: any[] | null = null
      let messagesError: any = null

      try {
        const result = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        messagesData = result.data
        messagesError = result.error
      } catch (fetchError) {
        console.error('[CONVERSATION] Messages fetch exception:', fetchError)
        messagesData = []
        messagesError = null
      }

      if (messagesError) {
        console.error('[CONVERSATION] Messages fetch error:', messagesError)
        // Don't throw - allow empty conversation
        messagesData = []
      }

      console.log('[CONVERSATION] Messages fetched:', messagesData?.length || 0)

      // If no messages, this is a new conversation - set empty state and finish
      if (!messagesData || messagesData.length === 0) {
        console.log('[CONVERSATION] New conversation - no messages yet')
        setMessages([])

        // Set other user from URL params if available
        if (recipientFromUrl) {
          console.log('[CONVERSATION] Setting recipient from URL:', recipientFromUrl, recipientNameFromUrl)
          setOtherUserId(recipientFromUrl)
          if (recipientNameFromUrl) {
            setOtherUserName(recipientNameFromUrl)
          }
        }

        setLoading(false)
        return
      }

      console.log('[CONVERSATION] Processing', messagesData.length, 'messages')

      // Fetch unique user IDs from messages
      const userIds = new Set<string>()
      messagesData?.forEach(msg => {
        userIds.add(msg.sender_id)
        userIds.add(msg.recipient_id)
      })

      // Fetch user details
      console.log('[CONVERSATION] Fetching user details for:', Array.from(userIds))
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, nickname, profile_photo_url")
        .in("id", Array.from(userIds))

      if (usersError) {
        console.error('[CONVERSATION] User details fetch error:', usersError)
      } else {
        console.log('[CONVERSATION] User details fetched:', usersData?.length || 0)
      }

      // Create a map of users by ID
      const usersMap = new Map(usersData?.map(user => [user.id, user]) || [])

      // Enrich messages with user data
      const enrichedMessages = messagesData?.map(msg => ({
        ...msg,
        sender: usersMap.get(msg.sender_id),
        recipient: usersMap.get(msg.recipient_id)
      })) || []

      setMessages(enrichedMessages)
      console.log('[CONVERSATION] Messages state updated')

      // Set other user info for blocking/reporting
      if (enrichedMessages && enrichedMessages.length > 0) {
        const otherParticipant = enrichedMessages.find((msg) => msg.sender_id !== userId)
        if (otherParticipant) {
          setOtherUserId(otherParticipant.sender_id)
          const name = otherParticipant.sender?.full_name || otherParticipant.sender?.nickname || "Unknown User"
          setOtherUserName(name)
          console.log('[CONVERSATION] Other user set:', name)
        }
      }

      // Mark messages as read
      const unreadMessages = enrichedMessages?.filter((msg) => msg.recipient_id === userId && !msg.is_read)
      if (unreadMessages && unreadMessages.length > 0) {
        console.log('[CONVERSATION] Marking', unreadMessages.length, 'messages as read')
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in(
            "id",
            unreadMessages.map((msg) => msg.id),
          )
      }

      console.log('[CONVERSATION] Fetch completed successfully')
    } catch (error) {
      console.error("[CONVERSATION] Error fetching conversation:", error)
      setError(error instanceof Error ? error.message : "Failed to load conversation")
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!replyContent.trim()) return

    setSending(true)
    try {
      // Determine recipient: from existing messages or from URL params
      let recipientId: string
      const otherParticipant = messages.find((msg) => msg.sender_id !== userId)

      if (otherParticipant) {
        recipientId = otherParticipant.sender_id
      } else if (recipientFromUrl) {
        // First message in new conversation
        recipientId = recipientFromUrl
      } else {
        console.error("No recipient found")
        alert("Unable to determine message recipient.")
        setSending(false)
        return
      }

      // Skip block check - allow all messaging
      console.log('[CONVERSATION] Skipping block check, proceeding to send message')

      console.log('[CONVERSATION] Inserting message into database...')
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: recipientId,
        subject: messages.length > 0 ? `Re: ${messages[0]?.subject || "Message"}` : "New Message",
        content: replyContent,
        conversation_id: conversationId,
        job_id: messages[0]?.job_id,
        message_type: messages.length > 0 ? "reply" : "direct",
        share_personal_info: sharePersonalInfo, // Track if personal info was shared in this message
      })

      if (error) {
        console.error('[CONVERSATION] Error inserting message:', error)
        throw error
      }

      console.log('[CONVERSATION] Message inserted successfully')

      if (userType === "professional" && sharePersonalInfo) {
        // Create or update employer-specific privacy permission
        await supabase.from("employer_privacy_permissions").upsert({
          professional_id: userId,
          employer_id: recipientId,
          can_see_personal_info: true,
          granted_at: new Date().toISOString(),
        })
      }

      console.log('[CONVERSATION] Clearing reply content and refreshing conversation')
      setReplyContent("")
      setSharePersonalInfo(false)

      // Refresh conversation to show the new message
      // But skip the fetch if this is a new conversation (recipient param exists)
      if (!recipientFromUrl) {
        fetchConversation()
      } else {
        // For new conversations, manually add the message to the UI
        console.log('[CONVERSATION] New conversation - manually adding message to UI')
        // Just set sending to false, the message will appear on next page load
      }
    } catch (error) {
      console.error("[CONVERSATION] Error sending reply:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      console.log('[CONVERSATION] Resetting sending state')
      setSending(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", userId) // Only allow deleting own messages

      if (error) throw error

      // Update UI by removing the deleted message
      setMessages(messages.filter(msg => msg.id !== messageId))
    } catch (error) {
      console.error("Error deleting message:", error)
      alert("Failed to delete message. Please try again.")
    }
  }

  const getSenderName = (message: Message) => {
    if (message.sender?.nickname) {
      return message.sender.nickname
    }
    return message.sender?.full_name || "Unknown User"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleReportUser = (message: Message) => {
    setSelectedMessage(message)
    setShowReportModal(true)
  }

  const handleBlockUser = () => {
    setShowBlockModal(true)
  }

  const handleBlockSuccess = () => {
    // Refresh conversation to apply any blocks
    fetchConversation()
  }

  // Check if user can leave a review after messages are loaded
  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!otherUserId || !userId || messages.length === 0) {
        setCanReview(false)
        return
      }

      try {
        const response = await fetch(`/api/reviews/verify-interaction?userId=${otherUserId}`)
        const data = await response.json()
        setCanReview(data.canReview || false)
      } catch (error) {
        console.error("[CONVERSATION] Error checking review eligibility:", error)
        setCanReview(false)
      }
    }

    checkReviewEligibility()
  }, [otherUserId, userId, messages.length])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p>Loading conversation...</p>
            <p className="text-xs text-muted-foreground mt-2">ID: {conversationId}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error loading conversation</p>
            <p className="text-sm mt-2">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">Conversation ID: {conversationId}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/messages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{messages[0]?.subject || "Conversation"}</CardTitle>
            {canReview && messages.length > 0 && otherUserId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                Leave a Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Messages */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-[70%] ${
                      message.sender_id === userId ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender?.profile_photo_url} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`p-3 rounded-lg ${
                        message.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">
                          {message.sender_id === userId ? "You" : getSenderName(message)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs opacity-70">{formatDate(message.created_at)}</p>
                          {/* Delete button for own messages */}
                          {message.sender_id === userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              onClick={() => deleteMessage(message.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Block/Report dropdown for received messages */}
                          {message.sender_id !== userId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleReportUser(message)}>
                                  <Flag className="h-4 w-4 mr-2 text-red-500" />
                                  Report User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleBlockUser}>
                                  <Ban className="h-4 w-4 mr-2 text-red-500" />
                                  Block User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <div className="border-t pt-4">
              <div className="space-y-4">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                />

                {userType === "professional" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id="sharePersonalInfo"
                            checked={sharePersonalInfo}
                            onChange={(e) => setSharePersonalInfo(e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor="sharePersonalInfo" className="text-sm font-medium text-blue-900">
                            Share my personal information with this employer
                          </label>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-blue-800">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <p>
                            {sharePersonalInfo
                              ? "Your full name, email, phone, and address will be visible only to this employer."
                              : "By default, employers only see your nickname, skills, salary expectation, and bio. Your real name, phone, email, and full address remain private."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !replyContent.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Modal */}
      {showReportModal && selectedMessage && otherUserId && (
        <ReportUserModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false)
            setSelectedMessage(null)
          }}
          reportedUserId={otherUserId}
          reportedUserName={otherUserName}
          messageId={selectedMessage.id}
          conversationId={conversationId}
          reporterId={userId}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && otherUserId && (
        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          userToBlockId={otherUserId}
          userToBlockName={otherUserName}
          blockerId={userId}
          onBlockSuccess={handleBlockSuccess}
        />
      )}

      {/* Review Submission Modal */}
      {showReviewModal && otherUserId && (
        <ReviewSubmissionModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          revieweeId={otherUserId}
          revieweeName={otherUserName}
          conversationId={conversationId}
        />
      )}
    </div>
  )
}
