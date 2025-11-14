"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Mail, Clock, User, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

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

interface MessagingDropdownProps {
  userId: string
  userType: "professional" | "company"
}

export default function MessagingDropdown({ userId, userType }: MessagingDropdownProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          fetchMessages()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, nickname, profile_photo_url)
        `)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setMessages(data || [])
      setUnreadCount(data?.filter((msg) => !msg.is_read).length || 0)
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", messageId)

      if (error) throw error

      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, is_read: true } : msg)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const getSenderName = (message: Message) => {
    if (message.sender?.nickname) {
      return message.sender.nickname
    }
    return message.sender?.full_name || "Unknown User"
  }

  const truncateContent = (content: string, maxLength = 60) => {
    return content.length > maxLength ? content.substring(0, maxLength) + "..." : content
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Mail className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Messages</h3>
            <Button variant="ghost" size="sm" asChild onClick={() => setIsOpen(false)}>
              <Link href="/messages">
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Link>
            </Button>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">
                {userType === "professional"
                  ? "Messages from employers will appear here"
                  : "Messages from professionals will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !message.is_read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    if (!message.is_read) {
                      markAsRead(message.id)
                    }
                    setIsOpen(false)
                  }}
                >
                  <Link
                    href={message.conversation_id ? `/messages/${message.conversation_id}` : `/messages`}
                    className="block"
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender?.profile_photo_url || "/placeholder.svg"} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{getSenderName(message)}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(message.created_at)}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1 truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{truncateContent(message.content)}</p>
                      </div>
                      {!message.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="p-3 border-t bg-muted/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              asChild
              onClick={() => setIsOpen(false)}
            >
              <Link href="/messages">Open Full Messages</Link>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
