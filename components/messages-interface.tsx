"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Send, MessageCircle, Users } from "lucide-react"

interface Message {
  id: string
  sender: string
  recipient: string
  subject: string
  content: string
  timestamp: string
  status: "read" | "unread"
  type: "user_to_user" | "admin_to_user" | "user_to_admin"
}

interface MessagesInterfaceProps {
  adminRole: string
  canSendMessages: boolean
}

export function MessagesInterface({ adminRole, canSendMessages }: MessagesInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newMessage, setNewMessage] = useState({ recipient: "", subject: "", content: "" })

  // Mock data for demonstration
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: "1",
        sender: "john.doe@example.com",
        recipient: "admin",
        subject: "Issue with job posting",
        content: "I'm having trouble posting my job listing. The form keeps showing an error.",
        timestamp: "2024-01-15T10:30:00Z",
        status: "unread",
        type: "user_to_admin",
      },
      {
        id: "2",
        sender: "admin",
        recipient: "jane.smith@example.com",
        subject: "Account verification",
        content: "Your account has been successfully verified. You can now access all features.",
        timestamp: "2024-01-14T15:45:00Z",
        status: "read",
        type: "admin_to_user",
      },
      {
        id: "3",
        sender: "mike.wilson@example.com",
        recipient: "sarah.jones@example.com",
        subject: "Job application follow-up",
        content: "Thank you for your application. We'll be in touch soon.",
        timestamp: "2024-01-13T09:15:00Z",
        status: "read",
        type: "user_to_user",
      },
    ]
    setMessages(mockMessages)
  }, [])

  const filteredMessages = messages.filter(
    (message) =>
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.recipient.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSendMessage = () => {
    if (!newMessage.recipient || !newMessage.subject || !newMessage.content) return

    const message: Message = {
      id: Date.now().toString(),
      sender: "admin",
      recipient: newMessage.recipient,
      subject: newMessage.subject,
      content: newMessage.content,
      timestamp: new Date().toISOString(),
      status: "read",
      type: "admin_to_user",
    }

    setMessages((prev) => [message, ...prev])
    setNewMessage({ recipient: "", subject: "", content: "" })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Messages List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages ({filteredMessages.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{message.sender}</p>
                        {message.status === "unread" && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{message.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {message.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Detail & Compose */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span>From: {selectedMessage.sender}</span>
                  <span>To: {selectedMessage.recipient}</span>
                  <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>
          ) : canSendMessages ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Compose Message</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient Email</label>
                  <Input
                    placeholder="user@example.com"
                    value={newMessage.recipient}
                    onChange={(e) => setNewMessage((prev) => ({ ...prev, recipient: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Message subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage((prev) => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    rows={8}
                    value={newMessage.content}
                    onChange={(e) => setNewMessage((prev) => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                <Button onClick={handleSendMessage} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a message to view details</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
