"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send, LogIn } from "lucide-react"
import Link from "next/link"

// ✅ Error boundary wrapper to avoid white screen
export default function NewMessagePageWrapper() {
  try {
    return <NewMessagePage />
  } catch (error) {
    console.error("[v0] Fatal render error:", error)
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500 font-semibold">Something went wrong. Check console logs.</p>
      </div>
    )
  }
}

function NewMessagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [sending, setSending] = useState(false)
  const [recipientId, setRecipientId] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [loadingRecipient, setLoadingRecipient] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createClient()

  // ✅ Check logged-in user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("[v0] Auth check error:", error)
        }

        if (user) setUser(user)
      } catch (err) {
        console.error("[v0] Auth check failed:", err)
        setErrorMsg("Authentication check failed.")
      } finally {
        setAuthChecked(true)
      }
    }

    // ✅ Grab params from URL
    const recipient = searchParams.get("recipient")
    const subjectParam = searchParams.get("subject")
    if (recipient) setRecipientId(recipient)
    if (subjectParam) setSubject(subjectParam)

    checkAuth()
  }, [searchParams, supabase])

  // ✅ Fetch recipient info safely
  useEffect(() => {
    if (!user || !recipientId || recipientInfo) return

    const fetchRecipientInfo = async (id: string) => {
      try {
        setLoadingRecipient(true)
        console.log("[v0] Fetching recipient info for:", id)

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type, email")
          .eq("id", id)
          .maybeSingle()

        if (userError) {
          console.error("[v0] Supabase userError:", userError)
          setErrorMsg("Failed to load recipient user info.")
          return
        }
        if (!userData) {
          console.warn("[v0] No user found for recipient:", id)
          setErrorMsg("Recipient not found.")
          return
        }

        let profileData = null
        if (userData.user_type === "professional") {
          const { data, error } = await supabase
            .from("professional_profiles")
            .select("first_name, last_name")
            .eq("user_id", id)
            .maybeSingle()
          if (error) console.error("[v0] professional_profiles error:", error)
          profileData = data
        } else if (userData.user_type === "company") {
          const { data, error } = await supabase
            .from("company_profiles")
            .select("company_name")
            .eq("user_id", id)
            .maybeSingle()
          if (error) console.error("[v0] company_profiles error:", error)
          profileData = data
        }

        setRecipientInfo({ ...userData, ...profileData })
      } catch (err) {
        console.error("[v0] Error fetching recipient info:", err)
        setErrorMsg("Failed to fetch recipient info.")
      } finally {
        setLoadingRecipient(false)
      }
    }

    fetchRecipientInfo(recipientId)
  }, [user, recipientId, recipientInfo, supabase])

  // ✅ Send message safely
  const handleSendMessage = async () => {
    if (!recipientId || !subject || !message) return

    setSending(true)
    try {
      const { data: existingConversation, error: convFetchError } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`,
        )
        .maybeSingle()

      if (convFetchError) {
        console.error("[v0] Error checking conversations:", convFetchError)
      }

      let conversationId = existingConversation?.id

      if (!conversationId) {
        const { data: newConversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({
            participant_1: user.id,
            participant_2: recipientId,
            subject: subject,
          })
          .select("id")
          .single()

        if (conversationError) {
          console.error("[v0] Conversation insert error:", conversationError)
          setErrorMsg("Failed to create conversation.")
          return
        }
        conversationId = newConversation.id
      }

      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message,
      })

      if (messageError) {
        console.error("[v0] Message insert error:", messageError)
        setErrorMsg("Failed to send message.")
        return
      }

      router.push(`/messages/${conversationId}`)
    } catch (err) {
      console.error("[v0] Error sending message:", err)
      setErrorMsg("Unexpected error while sending message.")
    } finally {
      setSending(false)
    }
  }

  // ✅ UI states
  if (!authChecked) {
    return (
      <div className="container mx-auto p-6 text-center">
        <div>Checking authentication...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">You need to be logged in to send messages.</p>
            <Button asChild className="w-full">
              <Link href="/auth/login">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/messages" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Messages
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          {loadingRecipient && <div className="text-sm text-muted-foreground">Loading recipient info...</div>}
          {recipientInfo && (
            <div className="text-sm text-muted-foreground">
              To:{" "}
              {recipientInfo.user_type === "professional"
                ? `${recipientInfo.first_name ?? ""} ${recipientInfo.last_name ?? ""}`
                : recipientInfo.company_name ?? "Unknown company"}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

          {!recipientId && (
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
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter message subject" />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!recipientId || !subject || !message || sending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
