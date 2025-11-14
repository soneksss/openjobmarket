"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Clock, User } from "lucide-react"
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
  job_id?: string
  conversation_id?: string
  sender?: {
    full_name?: string
    nickname?: string
    profile_photo_url?: string
  }
  job?: {
    title: string
  }
}

interface MessageInboxProps {
  userId: string
  userType: "professional" | "company"
}

export default function MessageInbox({ userId, userType }: MessageInboxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
  }, [userId])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, nickname, profile_photo_url),
          job:jobs(title)
        `)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })

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
      // 7 days
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading messages...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/messages">View All</Link>
          </Button>
        </CardTitle>
        <CardDescription>
          {messages.length === 0 ? "No messages yet" : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Messages from employers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.slice(0, 5).map((message) => (
              <div
                key={message.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  !message.is_read ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => {
                  if (!message.is_read) {
                    markAsRead(message.id)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.sender?.profile_photo_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{getSenderName(message)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">{message.subject}</p>
                      {message.job && <p className="text-xs text-muted-foreground mt-1">Re: {message.job.title}</p>}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{message.content}</p>
                    </div>
                  </div>
                  {!message.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
