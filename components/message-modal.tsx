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
  isOpen: boolean
  onClose: () => void
  professionalName: string
  professionalId: string
  user: any
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
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  const checkSubscriptionLimits = async () => {
    try {
      console.log("[MESSAGE-MODAL] Checking subscription limits...")
      // First check if subscriptions are even enabled
      const { data: adminSettings } = await supabase.rpc('get_admin_settings')

      // If subscriptions are disabled or not configured, allow contact
      if (!adminSettings?.subscriptions_enabled) {
        console.log("[MESSAGE-MODAL] Subscriptions disabled, allowing contact")
        setSubscriptionInfo({
          can_contact: true,
          reason: 'subscriptions_disabled',
          contacts_used: 0,
          contacts_limit: null
        })
        setError(null)
        return
      }

      console.log("[MESSAGE-MODAL] Subscriptions enabled, checking user subscription...")
      // Check user's subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`*, subscription_plans!inner(*)`)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!subscription) {
        // Allow contact even without subscription (fallback for development/testing)
        console.log("[MESSAGE-MODAL] No subscription found, allowing contact as fallback")
        setSubscriptionInfo({
          can_contact: true,
          reason: 'no_subscription_fallback',
          contacts_used: 0,
          contacts_limit: null
        })
        setError(null)
        return
      }

      console.log("[MESSAGE-MODAL] Subscription found, checking limits...")
      // Has subscription - check limits
      const contactLimit = subscription.subscription_plans.contact_limit
      const contactsUsed = subscription.contacts_used || 0

      if (contactLimit !== null && contactsUsed >= contactLimit) {
        console.log("[MESSAGE-MODAL] Contact limit exceeded")
        setSubscriptionInfo({
          can_contact: false,
          reason: 'contact_limit_exceeded',
          contacts_used: contactsUsed,
          contacts_limit: contactLimit
        })
        setError(`Contact limit reached (${contactsUsed}/${contactLimit})`)
        return
      }

      console.log("[MESSAGE-MODAL] All checks passed, allowing contact")
      setSubscriptionInfo({
        can_contact: true,
        reason: 'subscription_valid',
        contacts_used: contactsUsed,
        contacts_limit: contactLimit
      })
      setError(null)
    } catch (err) {
      console.log("[MESSAGE-MODAL] Exception checking subscription, allowing contact as fallback:", err)
      // Allow contact on any error (fail open)
      setSubscriptionInfo({
        can_contact: true,
        reason: 'system_fallback',
        contacts_used: 0,
        contacts_limit: null
      })
      setError(null)
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      checkSubscriptionLimits()
    }
  }, [isOpen, user, checkSubscriptionLimits])

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
      // Check if user can still contact (subscription might have changed)
      if (!subscriptionInfo?.can_contact) {
        setError("You cannot contact professionals at this time.")
        setLoading(false)
        return
      }

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

      // Increment contact usage counter (only if subscriptions are enabled and user has active subscription)
      if (subscriptionInfo?.reason === 'subscription_valid') {
        try {
          const { error: incrementError } = await supabase
            .from('user_subscriptions')
            .update({
              contacts_used: (subscriptionInfo.contacts_used || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gt('end_date', new Date().toISOString())

          if (incrementError) {
            console.error("Error incrementing usage counter:", incrementError)
          }
        } catch (usageError) {
          console.error("Exception incrementing usage counter:", usageError)
          // Don't fail the message send if usage increment fails
        }
      }

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

  const canSend = subscriptionInfo?.can_contact && message.trim() && subject.trim() && !loading

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

          {/* Subscription Status - Only show when subscriptions are enabled and user has a meaningful limit (not unlimited/free) */}
          {subscriptionInfo &&
           subscriptionInfo.reason === 'subscription_valid' &&
           subscriptionInfo.contacts_limit !== null &&
           subscriptionInfo.contacts_limit < 999999 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800">Contact Usage:</span>
                  <Badge variant="outline" className="text-blue-700">
                    {subscriptionInfo.contacts_used}/{subscriptionInfo.contacts_limit} used
                  </Badge>
                </div>
                {subscriptionInfo.contacts_limit !== null &&
                 subscriptionInfo.contacts_limit - subscriptionInfo.contacts_used <= 2 &&
                 subscriptionInfo.contacts_limit - subscriptionInfo.contacts_used > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    You're approaching your contact limit. Consider upgrading your subscription.
                  </p>
                )}
              </CardContent>
            </Card>
          )}


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
          {subscriptionInfo?.can_contact && !success && (
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
            {subscriptionInfo?.can_contact ? (
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
            ) : (
              <Button
                onClick={() => router.push("/dashboard/company/subscription")}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                View Subscription
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}