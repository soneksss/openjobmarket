"use client"

import { useState, useEffect } from "react"
import { X, MessageCircle, Send, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

type MessageModalProps = {
  isOpen?: boolean
  onClose: () => void
  professionalName?: string
  professionalId?: string
  /** Generic aliases used by non-professional callers */
  recipientName?: string
  recipientId?: string
  user?: any
}

export default function MessageModal({
  isOpen,
  onClose,
  professionalName,
  professionalId,
  user,
}: MessageModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [subject, setSubject] = useState("Job Opportunity Inquiry")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  // Messaging is free — no contact limits to check.
  useEffect(() => {
    if (isOpen && user) {
      setError(null)
      setSuccess(null)
    }
  }, [isOpen, user])

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message.")
      return
    }

    if (!subject.trim()) {
      setError("Please enter a subject.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if users are blocked
      try {
        const { data: isBlocked, error: blockError } = await supabase
          .rpc("is_user_blocked", { sender_id: user.id, recipient_id: professionalId })

        if (blockError) {
          console.error("Error checking block status:", blockError)
          // If block checking fails, continue with sending (don't block the message)
          console.log("Block check failed, allowing message to proceed")
        } else if (isBlocked) {
          setError("You cannot send messages to this user.")
          setLoading(false)
          return
        }
      } catch (blockException) {
        console.error("Exception checking block status:", blockException)
        // If block checking fails completely, continue with sending
        console.log("Block check exception, allowing message to proceed")
      }

      // Create conversation ID - generate a proper UUID
      // We can use crypto.randomUUID() or create a deterministic UUID based on user IDs
      const conversationId = crypto.randomUUID()

      // Send message directly to messages table
      const { data: insertData, error: messageError } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: professionalId,
        subject: subject.trim(),
        content: message.trim(),
        conversation_id: conversationId,
        message_type: "job_inquiry",
      }).select()

      if (messageError) {
        console.error("Error sending message:", messageError)
        console.error("Message error details:", messageError.message, messageError.details, messageError.hint)
        setError(`Failed to send message: ${messageError.message}`)
        setLoading(false)
        return
      }

      if (!insertData || insertData.length === 0) {
        console.error("Message insert succeeded but no data returned")
        setError("Message may not have been sent properly. Please check your messages.")
        setLoading(false)
        return
      }

      console.log("Message sent successfully:", insertData[0])
      setSuccess("Message sent successfully! Redirecting to conversation...")

      // Close modal and redirect to messages list after a short delay
      setTimeout(() => {
        onClose()
        router.push('/messages')
      }, 1500)
    } catch (err) {
      console.error("Exception sending message:", err)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const canSend = message.trim() && subject.trim() && !loading

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <span>Send Message</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Recipient Info */}
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">
              Message {professionalName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Send a professional inquiry about potential opportunities
            </p>
          </div>

          {/* Success Display */}
          {success && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Form */}
          {!success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Job Opportunity Inquiry"
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Hello ${professionalName}, I'm interested in discussing a potential opportunity with you...`}
                  rows={5}
                  disabled={loading}
                  className="w-full resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!canSend}
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}