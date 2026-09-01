"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"

interface NewMessageFormProps {
  userId: string
  recipientId: string
  jobId: string | null
  initialSubject: string
  returnUrl: string | null
}

export default function NewMessageForm({
  userId,
  recipientId: initialRecipientId,
  jobId,
  initialSubject,
  returnUrl,
}: NewMessageFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [recipientId, setRecipientId] = useState(initialRecipientId)
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState("")
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [loadingRecipient, setLoadingRecipient] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch recipient display name
  useEffect(() => {
    if (!recipientId) return
    let cancelled = false
    setLoadingRecipient(true)

    const fetch = async () => {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", recipientId)
          .maybeSingle()

        if (!userData || cancelled) return

        let name = "Unknown"
        if (userData.user_type === "company") {
          const { data: cp } = await supabase
            .from("company_profiles")
            .select("company_name")
            .eq("user_id", recipientId)
            .maybeSingle()
          name = cp?.company_name ?? "Company"
        } else if (userData.user_type === "professional") {
          const { data: pp } = await supabase
            .from("professional_profiles")
            .select("first_name, last_name")
            .eq("user_id", recipientId)
            .maybeSingle()
          name = `${pp?.first_name ?? ""} ${pp?.last_name ?? ""}`.trim() || "Professional"
        } else if (userData.user_type === "homeowner") {
          const { data: hp } = await supabase
            .from("homeowner_profiles")
            .select("first_name, last_name")
            .eq("user_id", recipientId)
            .maybeSingle()
          name = `${hp?.first_name ?? ""} ${hp?.last_name ?? ""}`.trim() || "Homeowner"
        }

        if (!cancelled) setRecipientInfo({ name })
      } catch (err) {
        console.error("[NEW-MESSAGE] Failed to fetch recipient info:", err)
      } finally {
        if (!cancelled) setLoadingRecipient(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId])

  const handleSend = async () => {
    if (!recipientId || !subject.trim() || !message.trim()) return
    if (recipientId === userId) {
      setErrorMsg("You cannot message yourself.")
      return
    }
    setSending(true)
    setErrorMsg(null)

    try {
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        { user1_id: userId, user2_id: recipientId, p_job_id: jobId || null, p_subject: subject.trim() || null }
      )

      if (convError || !conversationId) {
        console.error("[NEW-MESSAGE] Conversation error:", convError)
        setErrorMsg("Failed to create conversation. Please try again.")
        return
      }

      const msgRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipient_id: recipientId,
          content: message.trim(),
          job_id: jobId || undefined,
          conversation_id: conversationId,
        }),
      })

      if (!msgRes.ok) {
        const body = await msgRes.json().catch(() => ({}))
        if (msgRes.status === 409) {
          setErrorMsg(body?.error ?? "Wait for the homeowner to reply before sending another message.")
        } else {
          console.error("[NEW-MESSAGE] Send error:", body)
          setErrorMsg("Failed to send message. Please try again.")
        }
        return
      }

      // Fire-and-forget email notification
      fetch("/api/notifications/send-message-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, senderId: userId, conversationId, messageSubject: subject, messageContent: message }),
      }).catch(() => {})

      router.push(returnUrl ? `/messages/${conversationId}?returnUrl=${encodeURIComponent(returnUrl)}` : `/messages/${conversationId}`)
    } catch (err) {
      console.error("[NEW-MESSAGE] Unexpected error:", err)
      setErrorMsg("Unexpected error. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href={returnUrl ?? "/messages"}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {returnUrl ? "Back" : "Back to Messages"}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          {loadingRecipient && <p className="text-sm text-muted-foreground">Loading recipient…</p>}
          {recipientInfo && (
            <p className="text-sm text-muted-foreground">To: <span className="font-medium text-foreground">{recipientInfo.name}</span></p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

          {!initialRecipientId && (
            <div>
              <label className="text-sm font-medium">Recipient ID</label>
              <Input
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter recipient user ID"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here…"
              rows={6}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!recipientId || !subject.trim() || !message.trim() || sending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : "Send Message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
