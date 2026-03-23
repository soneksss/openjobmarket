"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, User, MapPin, Briefcase, CheckCircle, Clock, Play, PoundSterling } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { StatusDot } from "@/components/status-dot"
import { updatePresence } from "@/lib/presence"
import ReviewSubmissionModal from "@/components/review-submission-modal"

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  recipient_id: string
  is_read: boolean
  conversation_id?: string
  job_id?: string
  message_type?: string
  metadata?: { amount?: number; currency?: string }
}

interface JobContext {
  id: string
  title: string
  location?: string
  created_at?: string
  status?: string
  matching_status?: string
  is_tradespeople_job?: boolean
  urgency_type?: string | null
  max_responses?: number | null
}

export default function ConversationPage() {
  console.log('[CONVERSATION] Component rendering - TOP LEVEL')

  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prefillApplied = useRef(false)

  const conversationId = params.id as string
  const returnUrl = searchParams.get('returnUrl') ? decodeURIComponent(searchParams.get('returnUrl')!) : null
  const jobParam = searchParams.get('job')

  console.log('[CONVERSATION] Params:', params, 'conversationId:', conversationId)
  console.log('[CONVERSATION] Return URL:', returnUrl)

  const [user, setUser] = useState<any>(null)
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | undefined>(undefined)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [actualConvId, setActualConvId] = useState<string>(conversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [jobContext, setJobContext] = useState<JobContext | null>(null)
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false)
  const [showQuoteInput, setShowQuoteInput] = useState(false)
  const [quoteAmount, setQuoteAmount] = useState("")
  const [senderRole, setSenderRole] = useState<string | null>(null)
  const [responseCount, setResponseCount] = useState(0)
  const [hasAlreadyResponded, setHasAlreadyResponded] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null)
  const [conversationSubject, setConversationSubject] = useState<string | null>(null)
  const [otherUserProfileId, setOtherUserProfileId] = useState<string | null>(null)

  useEffect(() => {
    fetchConversation()
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Real-time: keep job status badge in sync with DB changes
  useEffect(() => {
    if (!jobContext?.id) return
    const channel = supabase
      .channel(`job-status-${jobContext.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobContext.id}`,
      }, (payload) => {
        const updated = payload.new as any
        setJobContext(prev => prev ? {
          ...prev,
          status: updated.status ?? prev.status,
          matching_status: updated.matching_status ?? prev.matching_status,
        } : null)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [jobContext?.id])

  // Prefill message on first open when navigated from a job context
  useEffect(() => {
    if (prefillApplied.current) return
    if (!jobContext || messages.length > 0 || !jobParam) return
    prefillApplied.current = true
    setNewMessage(
      jobContext.urgency_type !== 'flexible'
        ? "Hi, I can take this job today."
        : "Hi, I can help with this job."
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobContext, messages])

  const fetchConversation = async () => {
    updatePresence() // best-effort, fire-and-forget
    console.log('[CONVERSATION] fetchConversation called')
    try {
      console.log('[CONVERSATION] Step 1: Getting user...')
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      console.log('[CONVERSATION] Step 2: User retrieved:', !!currentUser)
      console.log('[CONVERSATION] Step 3: Current user:', currentUser?.id)

      if (!currentUser) {
        console.log('[CONVERSATION] No user found, redirecting to login')
        router.push('/login')
        return
      }

      setUser(currentUser)
      console.log('[CONVERSATION] Step 4: User state set')

      // Fetch the conversation to determine the other participant
      console.log('[CONVERSATION] Step 4.5: Fetching conversation...')
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("participant_1, participant_2, job_id, subject")
        .eq("id", conversationId)
        .maybeSingle()

      console.log('[CONVERSATION] Step 4.6: Conversation retrieved:', !!conversation, 'error:', convError)

      // If conversation doesn't exist in the table, the ID might be a user ID instead
      let determinedOtherId: string | null = null
      let actualConversationId: string = conversationId

      if (!conversation && !convError) {
        // The ID might be a user ID, not a conversation ID
        // This happens when navigating from profile pages that use /messages/{userId}
        console.log('[CONVERSATION] No conversation found. Checking if ID is a user ID...')

        // Check if the ID corresponds to a user
        const { data: potentialUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", conversationId)
          .maybeSingle()

        if (potentialUser) {
          console.log('[CONVERSATION] ID is a user ID, getting/creating conversation...')
          determinedOtherId = conversationId

          // Get or create the conversation — use the API route (admin client) to
          // bypass GRANT EXECUTE issues that affect certain user types on the RPC
          const convRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ with_user_id: conversationId }),
          })
          const convJson = await convRes.json()

          if (!convRes.ok || !convJson.conversationId) {
            console.error('[CONVERSATION] Error creating conversation:', convJson)
            setLoading(false)
            return
          }

          actualConversationId = convJson.conversationId
          console.log('[CONVERSATION] Step 4.7: Conversation created/retrieved:', actualConversationId)

          // Update URL to use the real conversation ID (for bookmarking/refresh)
          const qs = new URLSearchParams()
          if (returnUrl) qs.set('returnUrl', returnUrl)
          if (jobParam) qs.set('job', jobParam)
          const newUrl = qs.toString()
            ? `/messages/${actualConversationId}?${qs.toString()}`
            : `/messages/${actualConversationId}`
          window.history.replaceState({}, '', newUrl)
          console.log('[CONVERSATION] URL updated to:', newUrl)
        } else {
          // Try to find messages in this conversation to determine the other user
          console.log('[CONVERSATION] Attempting to infer other user from messages...')
          const { data: sampleMessage } = await supabase
            .from("messages")
            .select("sender_id, recipient_id")
            .eq("conversation_id", conversationId)
            .limit(1)
            .maybeSingle()

          if (sampleMessage) {
            determinedOtherId = sampleMessage.sender_id === currentUser.id
              ? sampleMessage.recipient_id
              : sampleMessage.sender_id
            console.log('[CONVERSATION] Step 4.7: Other user inferred from message:', determinedOtherId)
          }
        }
      } else if (convError) {
        console.error('[CONVERSATION] Error fetching conversation:', convError)
        setLoading(false)
        return
      } else if (conversation) {
        // Determine which participant is the other user
        determinedOtherId = conversation.participant_1 === currentUser.id
          ? conversation.participant_2
          : conversation.participant_1
        console.log('[CONVERSATION] Step 4.7: Other user determined from conversation:', determinedOtherId)
        if (conversation.subject) setConversationSubject(conversation.subject)
      }

      // Last resort: ask the server (bypasses RLS on conversations table)
      if (!determinedOtherId) {
        console.log('[CONVERSATION] Falling back to server-side conversation lookup...')
        try {
          const res = await fetch(`/api/conversations?id=${conversationId}`, { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            determinedOtherId = data.otherUserId ?? null
            console.log('[CONVERSATION] Server-side lookup result:', determinedOtherId)
          }
        } catch (e) {
          console.error('[CONVERSATION] Server-side lookup failed:', e)
        }
      }

      if (!determinedOtherId) {
        console.error('[CONVERSATION] Could not determine other user')
        setLoading(false)
        return
      }

      // Use the actual conversation ID for fetching messages
      const messageConversationId = actualConversationId
      setActualConvId(actualConversationId)

      setOtherUserId(determinedOtherId)

      // Fetch current user's profile photo
      console.log('[CONVERSATION] Step 5: Fetching current user data...')
      const { data: currentUserData, error: currentUserError } = await supabase
        .from("users")
        .select("user_type, profile_photo_url")
        .eq("id", currentUser.id)
        .single()

      console.log('[CONVERSATION] Step 6: Current user data retrieved:', !!currentUserData, 'error:', currentUserError)

      if (currentUserData) {
        setSenderRole(currentUserData.user_type)
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

      // Fetch other user's info with error handling for deleted users
      console.log('[CONVERSATION] Step 10: Fetching other user data for ID:', determinedOtherId)
      let displayName = 'Deleted User'
      let photoUrl: string | undefined = undefined
      let otherUserType: string | null = null
      let profileUrl: string | null = null

      try {
        const { data: userData, error: userDataError } = await supabase
          .from("users")
          .select("user_type, full_name, nickname, profile_photo_url, email, last_seen_at")
          .eq("id", determinedOtherId)
          .maybeSingle()

        console.log('[CONVERSATION] Step 11: Other user data retrieved:', !!userData, 'error:', userDataError)

        if (userData && !userDataError) {
          displayName = userData.nickname || userData.full_name || userData.email || 'Unknown User'
          photoUrl = userData.profile_photo_url
          otherUserType = userData.user_type ?? null
          setOtherUserLastSeen(userData.last_seen_at ?? null)
          console.log('[CONVERSATION] Step 12: Other user type:', userData.user_type)

          // Get profile-specific data with error handling
          try {
            if (userData.user_type === 'professional') {
              console.log('[CONVERSATION] Step 13a: Fetching professional profile...')
              const { data: profData } = await supabase
                .from('professional_profiles')
                .select('id, first_name, last_name, profile_photo_url')
                .eq('user_id', determinedOtherId)
                .maybeSingle()

              console.log('[CONVERSATION] Step 13b: Professional profile retrieved:', !!profData)
              if (profData) {
                const fullName = [profData.first_name, profData.last_name].filter(Boolean).join(' ')
                displayName = fullName || displayName
                photoUrl = profData.profile_photo_url || photoUrl
                setOtherUserProfileId(profData.id)
              }
            } else if (userData.user_type === 'company') {
              console.log('[CONVERSATION] Step 13a: Fetching company profile...')
              const { data: compData } = await supabase
                .from('company_profiles')
                .select('id, company_name, logo_url')
                .eq('user_id', determinedOtherId)
                .maybeSingle()

              console.log('[CONVERSATION] Step 13b: Company profile retrieved:', !!compData)
              if (compData) {
                displayName = compData.company_name || displayName
                photoUrl = compData.logo_url || photoUrl
                profileUrl = `/companies/${compData.id}`
                setOtherUserProfileId(compData.id)
              }
            } else if (userData.user_type === 'homeowner') {
              console.log('[CONVERSATION] Step 13a: Fetching homeowner profile...')
              const { data: homeownerData } = await supabase
                .from('homeowner_profiles')
                .select('id, first_name, last_name, profile_photo_url')
                .eq('user_id', determinedOtherId)
                .maybeSingle()

              console.log('[CONVERSATION] Step 13b: Homeowner profile retrieved:', !!homeownerData)
              if (homeownerData) {
                const fullName = [homeownerData.first_name, homeownerData.last_name].filter(Boolean).join(' ')
                displayName = fullName || displayName
                photoUrl = homeownerData.profile_photo_url || photoUrl
                profileUrl = `/homeowners/${homeownerData.id}`
              }
            } else if (userData.user_type === 'contractor') {
              console.log('[CONVERSATION] Step 13a: Fetching contractor profile...')
              const { data: contractorData } = await supabase
                .from('contractor_profiles')
                .select('id, company_name, profile_photo_url')
                .eq('user_id', determinedOtherId)
                .maybeSingle()

              console.log('[CONVERSATION] Step 13b: Contractor profile retrieved:', !!contractorData)
              if (contractorData) {
                displayName = contractorData.company_name || displayName
                photoUrl = contractorData.profile_photo_url || photoUrl
                profileUrl = `/contractors/${contractorData.id}`
                setOtherUserProfileId(contractorData.id)
              }
            }
          } catch (profileError) {
            console.error('[CONVERSATION] Error fetching profile:', profileError)
            // Continue with basic displayName from users table
          }
        } else {
          console.log('[CONVERSATION] User not found (likely deleted):', determinedOtherId)
        }
      } catch (error) {
        console.error('[CONVERSATION] Error fetching user:', error)
        // Continue with "Deleted User" as displayName
      }

      // Always set the other user, even if deleted
      setOtherUser({
        id: determinedOtherId,
        name: displayName,
        profile_photo_url: photoUrl,
        user_type: otherUserType,
        profile_url: profileUrl,
      })
      console.log('[CONVERSATION] Step 14: Other user state set:', displayName)

      // Fetch messages for this specific conversation
      console.log('[CONVERSATION] Step 15: Fetching messages for conversation:', messageConversationId)
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", messageConversationId)
        .order("created_at", { ascending: true })

      console.log('[CONVERSATION] Step 16: Messages retrieved:', messagesData?.length || 0, 'error:', error)

      if (error) throw error

      setMessages(messagesData || [])
      console.log('[CONVERSATION] Step 17: Messages state set')

      // Fetch job context — from conversation record, any message job_id, or ?job= param
      const jobId = (conversation as any)?.job_id ?? messagesData?.find(msg => msg.job_id)?.job_id ?? jobParam
      if (jobId) {
        console.log('[CONVERSATION] Step 17.5: Fetching job context for:', jobId)
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, location, created_at, status, matching_status, is_tradespeople_job, urgency_type, max_responses')
          .eq('id', jobId)
          .maybeSingle()

        if (jobData && !jobError) {
          setJobContext(jobData)
          console.log('[CONVERSATION] Job context loaded:', jobData.title)

          // For flexible jobs with a cap: fetch distinct tradesperson responders
          if (jobData.urgency_type === 'flexible' && jobData.max_responses) {
            const { data: responders } = await supabase
              .from('messages')
              .select('sender_id')
              .eq('job_id', jobId)
              .eq('sender_role', 'tradesperson')

            const distinctIds = new Set(responders?.map(r => r.sender_id) || [])
            setResponseCount(distinctIds.size)
            setHasAlreadyResponded(distinctIds.has(currentUser.id))
          }
        }
      }

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
    if (!newMessage.trim() || sending || !otherUserId) return

    // Response cap check for flexible jobs
    if (jobContext?.urgency_type === 'flexible' && jobContext.max_responses && senderRole === 'contractor') {
      if (!hasAlreadyResponded && responseCount >= jobContext.max_responses) {
        alert("This job already received enough responses.")
        return
      }
    }

    setSending(true)
    try {
      console.log('[CONVERSATION] Sending message with conversation_id:', actualConvId, 'to recipient:', otherUserId)

      // Use the tracked conversation ID (already created/validated in fetchConversation)
      const finalConversationId = actualConvId

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: otherUserId,
          subject: messages.length > 0 ? "Reply" : "New Message",
          content: newMessage.trim(),
          conversation_id: finalConversationId,
          message_type: "direct",
          job_id: jobContext?.id ?? null,
          sender_role: senderRole,
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
        recipient_id: otherUserId!,
        is_read: false,
        conversation_id: finalConversationId
      }

      setMessages(prev => [...prev, tempMessage])
      setNewMessage("")
      updatePresence() // update own presence on send

      // Refresh to get actual message from DB
      setTimeout(() => fetchConversation(), 500)
    } catch (error) {
      console.error("[CONVERSATION] Error sending:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleSendQuote = async () => {
    const amount = parseFloat(quoteAmount)
    if (isNaN(amount) || amount <= 0 || sending || !otherUserId) return

    // Response cap check for flexible jobs
    if (jobContext?.urgency_type === 'flexible' && jobContext.max_responses && senderRole === 'contractor') {
      if (!hasAlreadyResponded && responseCount >= jobContext.max_responses) {
        alert("This job already received enough responses.")
        return
      }
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: otherUserId,
          subject: "Quote",
          content: `Sent a quote for £${amount.toFixed(2)}`,
          conversation_id: actualConvId,
          message_type: "quote",
          metadata: { amount, currency: "GBP" },
          job_id: jobContext?.id ?? null,
          sender_role: senderRole,
          is_read: false,
          share_personal_info: false
        })

      if (error) throw error

      setQuoteAmount("")
      setShowQuoteInput(false)
      setTimeout(() => fetchConversation(), 500)
    } catch (error) {
      console.error("[CONVERSATION] Error sending quote:", error)
      alert("Failed to send quote")
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

  const updateJobStatus = async (newStatus: string) => {
    if (!jobContext?.id) return

    setUpdatingJobStatus(true)
    try {
      if (newStatus === 'completed') {
        const res = await fetch(`/api/jobs/${jobContext.id}/complete`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? 'Failed to complete job')
        }
        setJobContext(prev => prev ? { ...prev, status: 'COMPLETED', matching_status: 'closed' } : null)
        // Prompt the homeowner to leave a review immediately
        setShowReviewModal(true)
      } else if (newStatus === 'CONFIRMED') {
        if (!otherUserProfileId) throw new Error('Tradesperson profile ID not found')
        const { error } = await supabase.rpc('confirm_tradesperson', {
          p_job_id: jobContext.id,
          p_tradesperson_id: otherUserProfileId,
        })
        if (error) throw error
        setJobContext(prev => prev ? { ...prev, status: 'CONFIRMED' } : null)
      } else {
        const { error } = await supabase
          .from('jobs')
          .update({ matching_status: newStatus })
          .eq('id', jobContext.id)
        if (error) throw error
        setJobContext(prev => prev ? { ...prev, matching_status: newStatus } : null)
      }
    } catch (error: any) {
      console.error('[CONVERSATION] Error updating job status:', error)
      alert(error.message || 'Failed to update job status')
    } finally {
      setUpdatingJobStatus(false)
    }
  }

  const getJobStatusBadge = () => {
    if (!jobContext) return null

    // Only show meaningful states. "searching" / "POSTED" / "open" are hidden —
    // they're misleading inside an active conversation.
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      CONFIRMED:   { label: 'Confirmed',   className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      ACTIVE:      { label: 'In Progress', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',   icon: Play },
      COMPLETED:   { label: 'Completed',   className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      in_progress: { label: 'In Progress', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',   icon: Play },
      closed:      { label: 'Completed',   className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
    }

    // job.status takes priority; fall back to matching_status
    const status = jobContext.status === 'CONFIRMED' || jobContext.status === 'ACTIVE' || jobContext.status === 'COMPLETED'
      ? jobContext.status
      : (jobContext.matching_status ?? jobContext.status)

    const config = statusConfig[status || '']
    if (!config) return null // hide for POSTED / searching / reviewing / open

    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.className} border font-medium text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto p-4 md:p-6">
          <div className="text-center text-slate-300 py-12">Loading conversation...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-[60] pb-16 md:pb-0">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="bg-slate-800/90 rounded-t-xl border border-slate-700/50 border-b-0 p-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            {returnUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
                asChild
              >
                <Link href={returnUrl}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
                onClick={() => router.push('/messages')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {otherUser?.profile_url ? (
              <Link href={otherUser.profile_url} className="flex items-center gap-2 group">
                <Avatar className="h-9 w-9 border border-slate-600 flex-shrink-0 group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all">
                  <AvatarImage src={otherUser?.profile_photo_url} />
                  <AvatarFallback className="bg-slate-700 text-slate-300">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white text-sm group-hover:text-emerald-400 transition-colors">{otherUser?.name || 'Unknown User'}</span>
                  <StatusDot lastSeenAt={otherUserLastSeen} />
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border border-slate-600 flex-shrink-0">
                  <AvatarImage src={otherUser?.profile_photo_url} />
                  <AvatarFallback className="bg-slate-700 text-slate-300">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white text-sm">{otherUser?.name || 'Unknown User'}</span>
                  <StatusDot lastSeenAt={otherUserLastSeen} />
                </div>
              </div>
            )}
          </div>

          {/* Subject (non-job conversations) */}
          {!jobContext && conversationSubject && (
            <div className="mt-2 px-2.5 py-1.5 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-xs text-slate-400 truncate">{conversationSubject}</p>
            </div>
          )}

          {/* Job Context Header */}
          {jobContext && (
            <div className="mt-2 px-3 py-2 bg-slate-800/70 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between gap-2 min-w-0">
                {/* Left: icon + title + meta row */}
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate leading-snug">{jobContext.title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 flex-wrap leading-none">
                      {jobContext.location && (
                        <>
                          <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate max-w-[90px]">
                            {jobContext.location.split(',')[1]?.trim() || jobContext.location.split(',')[0]?.trim()}
                          </span>
                          <span className="text-slate-600">·</span>
                        </>
                      )}
                      {jobContext.created_at && (
                        <span>{new Date(jobContext.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      )}
                      {jobContext.urgency_type === 'flexible' && jobContext.max_responses && (
                        <>
                          <span className="text-slate-600">·</span>
                          {senderRole === 'homeowner' ? (
                            <span className="text-emerald-400">{responseCount}/{jobContext.max_responses} responded</span>
                          ) : senderRole === 'contractor' ? (
                            <span className={responseCount >= jobContext.max_responses ? 'text-red-400' : 'text-amber-400'}>
                              {Math.max(0, jobContext.max_responses - responseCount)} spots left
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Right: badge + action */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {getJobStatusBadge()}
                  {jobContext.is_tradespeople_job && senderRole === 'homeowner' && jobContext.status !== 'COMPLETED' && (
                    jobContext.status === 'CONFIRMED' ? (
                      <Button
                        size="sm"
                        onClick={() => updateJobStatus('completed')}
                        disabled={updatingJobStatus}
                        className="h-6 px-2 text-[10px] bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 font-medium"
                        variant="outline"
                      >
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        {updatingJobStatus ? '…' : 'Done'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => updateJobStatus('CONFIRMED')}
                        disabled={updatingJobStatus}
                        className="h-6 px-2 text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 font-medium"
                        variant="outline"
                      >
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        {updatingJobStatus ? '…' : 'Confirm'}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="bg-slate-800/60 border-x border-slate-700/50 flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSent = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0 border border-slate-600">
                    <AvatarImage
                      src={isSent ? currentUserPhoto : otherUser?.profile_photo_url}
                    />
                    <AvatarFallback className="bg-slate-700 text-slate-400 text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2 ${
                        isSent
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {message.message_type === 'quote' ? (
                        <div className="min-w-[140px]">
                          <div className="flex items-center gap-1 mb-1 opacity-80">
                            <PoundSterling className="h-3 w-3" />
                            <span className="text-[11px] font-medium uppercase tracking-wide">Quote</span>
                          </div>
                          <p className="text-2xl font-bold leading-none">
                            £{message.metadata?.amount?.toFixed(2) ?? '—'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/90 rounded-b-xl border border-slate-700/50 border-t-0 p-3 flex-shrink-0">
          {/* Quote input panel */}
          {showQuoteInput && (
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">£</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-700 border border-emerald-500/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendQuote() }}
                />
              </div>
              <Button
                onClick={handleSendQuote}
                disabled={!quoteAmount || parseFloat(quoteAmount) <= 0 || sending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4"
              >
                Send
              </Button>
              <Button
                onClick={() => { setShowQuoteInput(false); setQuoteAmount("") }}
                variant="ghost"
                className="text-slate-400 hover:text-white px-2"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Quick suggestion chips — shown only on first message when job context is known */}
          {messages.length === 0 && jobContext?.urgency_type && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(senderRole === 'homeowner'
                ? ["When can you come to take a look?", "What would this job roughly cost?", "Are you available today or tomorrow?", "Do you need more details or photos?"]
                : jobContext.urgency_type !== 'flexible'
                  ? ["Available now", "I can come today", "What time works for you?"]
                  : ["When would you like this done?", "Happy to provide a quote"]
              ).map((chip) => (
                <button
                  key={chip}
                  onClick={() => setNewMessage(chip)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* Quote button */}
            <Button
              onClick={() => setShowQuoteInput((v) => !v)}
              variant="ghost"
              size="sm"
              title="Send a quote"
              className={`self-end h-[44px] px-3 flex-shrink-0 ${showQuoteInput ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700'}`}
            >
              <PoundSterling className="h-4 w-4" />
            </Button>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="resize-none bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 min-h-[44px] py-2.5"
              rows={1}
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
              className="self-end bg-emerald-600 hover:bg-emerald-700 text-white h-[44px] w-[44px] p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
            Press Enter to send
          </p>
        </div>
      </div>

      {/* Review modal — auto-shown after homeowner marks job completed */}
      {showReviewModal && jobContext && otherUserId && (
        <ReviewSubmissionModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          jobId={jobContext.id}
          jobTitle={jobContext.title}
          reviewedUserId={otherUserId}
          reviewedUserName={otherUser?.name || 'the tradesperson'}
          reviewedUserType={(otherUser?.user_type ?? 'company') as any}
          reviewerType="homeowner"
          onSuccess={() => setShowReviewModal(false)}
        />
      )}
    </div>
  )
}
