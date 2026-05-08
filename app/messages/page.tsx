"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageCircle, ArrowLeft, Trash2, User, Briefcase, CheckCircle, Play } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { RateCompanyModal } from "@/components/rate-company-modal"
import { StatusDot } from "@/components/status-dot"
import { updatePresence } from "@/lib/presence"

interface JobInfo {
  id: string
  title: string
  matching_status?: string
  status?: string
  urgency_type?: string
}

interface Conversation {
  id: string
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
    job_id?: string
  }
  unread_count: number
  job?: JobInfo
  subject?: string | null
  other_user_last_seen?: string | null
}

export default function MessagesPage() {
  const [user, setUser]                       = useState<any>(null)
  const [userType, setUserType]               = useState<"professional" | "company" | "homeowner" | "contractor" | null>(null)
  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedUserToRate, setSelectedUserToRate] = useState<{userId: string, name: string} | null>(null)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk]       = useState(false)
  const [visibleCount, setVisibleCount]        = useState(20)

  const supabase   = createClient()
  const router     = useRouter()

  // Cached across re-fetches so back navigation never re-hits auth
  const cachedUser     = useRef<any>(null)
  const cachedUserType = useRef<string | null>(null)
  const lastFetchAt    = useRef<number>(0)
  const STALE_MS       = 30_000 // skip full re-fetch if data is < 30 s old

  const fetchConversations = useCallback(async (force = false) => {
    updatePresence() // fire-and-forget

    // If we have fresh data and this is a background re-fetch, skip it
    const now = Date.now()
    if (!force && conversations.length > 0 && now - lastFetchAt.current < STALE_MS) return

    // Only show the loading spinner on the very first load
    const isFirstLoad = !cachedUser.current
    if (isFirstLoad) setLoading(true)

    try {
      // ── Step 1: Auth (use cache after first load) ────────────────────────
      let currentUser = cachedUser.current
      let currentUserType = cachedUserType.current

      if (!currentUser) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setError("Please log in to view messages")
          setLoading(false)
          return
        }
        currentUser = authUser
        cachedUser.current = authUser
        setUser(authUser)

        // Fetch user_type in parallel with the first messages fetch below
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", currentUser.id)
          .single()
        currentUserType = userData?.user_type ?? null
        cachedUserType.current = currentUserType
        setUserType(currentUserType as any)
      }

      const uid = currentUser.id

      // ── Step 2: Fetch messages + conversations IN PARALLEL ───────────────
      const [messagesResult, convsResult] = await Promise.all([
        supabase
          .from("messages")
          .select("id, subject, content, created_at, is_read, sender_id, recipient_id, conversation_id, job_id")
          .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("conversations")
          .select("id, participant_1, participant_2, created_at, job_id, subject")
          .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
          .order("created_at", { ascending: false })
          .limit(100),
      ])

      if (messagesResult.error) throw messagesResult.error
      if (convsResult.error) throw convsResult.error

      const messages = messagesResult.data ?? []
      const emptyConvs = convsResult.data ?? []

      // Build a map of conversation details for subject/job_id lookups
      const convsDetailMap = new Map((emptyConvs as any[]).map(c => [c.id, c]))

      // ── Step 3: Synthetic "empty" conversations (no messages yet) ────────
      const coveredConvIds = new Set<string>()
      for (const msg of messages) {
        if ((msg as any).conversation_id) coveredConvIds.add((msg as any).conversation_id)
      }

      const emptySynthetic: typeof messages = []
      for (const conv of emptyConvs) {
        if (!coveredConvIds.has(conv.id)) {
          const otherId = conv.participant_1 === uid ? conv.participant_2 : conv.participant_1
          emptySynthetic.push({
            id:              `empty-${conv.id}`,
            subject:         (conv as any).subject ?? "",
            content:         "No messages yet — say hello!",
            created_at:      conv.created_at,
            is_read:         true,
            sender_id:       otherId,
            recipient_id:    uid,
            conversation_id: conv.id,
            job_id:          (conv as any).job_id ?? null,
            _empty:          true,
          } as any)
        }
      }

      const allMessages = [...messages, ...emptySynthetic]

      if (allMessages.length === 0) {
        setConversations([])
        lastFetchAt.current = Date.now()
        setLoading(false)
        return
      }

      // ── Step 4: Group by conversation_id (falls back to user pair for legacy messages) ──
      const conversationMap = new Map<string, { messages: typeof allMessages; other_user_id: string; conversation_id?: string }>()
      for (const msg of allMessages) {
        const otherId = msg.sender_id === uid ? msg.recipient_id : msg.sender_id
        const convKey = (msg as any).conversation_id ?? `legacy-${[uid, otherId].sort().join("-")}`
        if (!conversationMap.has(convKey)) {
          conversationMap.set(convKey, { messages: [], other_user_id: otherId, conversation_id: (msg as any).conversation_id })
        }
        conversationMap.get(convKey)!.messages.push(msg)
      }

      const userIds = [...conversationMap.values()].map(v => v.other_user_id).filter(id => id && id !== "undefined" && id !== "null")
      const msgJobIds  = allMessages.filter(m => m.job_id).map(m => m.job_id)
      const convJobIds = emptyConvs.map(c => (c as any).job_id).filter(Boolean)
      const jobIds     = [...new Set([...msgJobIds, ...convJobIds])] as string[]

      if (userIds.length === 0) {
        setConversations([])
        lastFetchAt.current = Date.now()
        setLoading(false)
        return
      }

      // ── Step 5: Fetch users + jobs IN PARALLEL ───────────────────────────
      const [usersResult, jobsResult] = await Promise.all([
        supabase
          .from("users")
          .select("id, user_type, full_name, nickname, profile_photo_url, email, last_seen_at")
          .in("id", userIds),

        jobIds.length > 0
          ? supabase.from("jobs").select("id, title, matching_status, status, urgency_type").in("id", jobIds)
          : Promise.resolve({ data: [] }),
      ])

      const usersMap = new Map<string, any>((usersResult.data ?? []).map(u => [u.id, u as any]))
      const jobsMap  = new Map<string, any>((jobsResult.data ?? []).map((j: any) => [j.id, j]))

      // ── Step 6: Fetch ALL profile tables IN PARALLEL ─────────────────────
      const proIds        = (usersResult.data ?? []).filter(u => u.user_type === "professional").map(u => u.id)
      // 'professional' is a legacy user_type from the trigger default; their profile lives in company_profiles
      const compIds       = (usersResult.data ?? []).filter(u => u.user_type === "company" || u.user_type === "professional").map(u => u.id)
      const homeownerIds2 = (usersResult.data ?? []).filter(u => u.user_type === "homeowner").map(u => u.id)
      const contractorIds = (usersResult.data ?? []).filter(u => u.user_type === "contractor").map(u => u.id)

      const [proResult, compResult, homeResult, contractorResult] = await Promise.all([
        Promise.resolve({ data: [] }),  // professional_profiles unused; merged into compIds
        compIds.length > 0
          ? supabase.from("company_profiles").select("user_id, company_name, logo_url").in("user_id", compIds)
          : Promise.resolve({ data: [] }),
        homeownerIds2.length > 0
          ? supabase.from("homeowner_profiles").select("user_id, first_name, last_name, profile_photo_url").in("user_id", homeownerIds2)
          : Promise.resolve({ data: [] }),
        contractorIds.length > 0
          ? supabase.from("contractor_profiles").select("user_id, company_name, profile_photo_url").in("user_id", contractorIds)
          : Promise.resolve({ data: [] }),
      ])

      const proMap        = new Map<string, any>((proResult.data ?? []).map((p: any) => [p.user_id, p]))
      const compMap       = new Map<string, any>((compResult.data ?? []).map((c: any) => [c.user_id, c]))
      const homeMap       = new Map<string, any>((homeResult.data ?? []).map((h: any) => [h.user_id, h]))
      const contractorMap = new Map<string, any>((contractorResult.data ?? []).map((c: any) => [c.user_id, c]))

      // ── Step 7: Build conversation list ──────────────────────────────────
      const conversationsData: Conversation[] = []

      for (const [, convData] of conversationMap) {
        const otherUserId = convData.other_user_id
        const otherUser = usersMap.get(otherUserId)
        let displayName = "Deleted User"
        let photoUrl: string | undefined

        if (otherUser) {
          displayName = otherUser.nickname || otherUser.full_name || otherUser.email || "Unknown User"
          photoUrl = otherUser.profile_photo_url

          if (otherUser.user_type === "company" || otherUser.user_type === "professional") {
            const c = compMap.get(otherUserId)
            if (c) {
              displayName = c.company_name || displayName
              photoUrl = c.logo_url || photoUrl
            }
          } else if (otherUser.user_type === "homeowner") {
            const h = homeMap.get(otherUserId)
            if (h) {
              displayName = [h.first_name, h.last_name].filter(Boolean).join(" ") || displayName
              photoUrl = h.profile_photo_url || photoUrl
            }
          } else if (otherUser.user_type === "contractor") {
            const c = contractorMap.get(otherUserId)
            if (c) {
              displayName = c.company_name || displayName
              photoUrl = c.profile_photo_url || photoUrl
            }
          }
        }

        const lastMessage = convData.messages[0]
        const unreadCount = convData.messages.filter(m => m.recipient_id === uid && !m.is_read).length
        const convDetail  = convData.conversation_id ? convsDetailMap.get(convData.conversation_id) : undefined
        const convJobId   = convDetail?.job_id ?? convData.messages.find(m => m.job_id)?.job_id
        const jobInfo     = convJobId ? jobsMap.get(convJobId) : undefined
        const subject     = convDetail?.subject ?? null

        conversationsData.push({
          id: convData.conversation_id ?? otherUserId,
          other_user: { id: otherUserId, name: displayName, profile_photo_url: photoUrl },
          last_message: {
            content:    lastMessage.content,
            created_at: lastMessage.created_at,
            is_read:    lastMessage.is_read,
            sender_id:  lastMessage.sender_id,
            job_id:     lastMessage.job_id,
          },
          unread_count: unreadCount,
          job: jobInfo,
          subject,
          other_user_last_seen: otherUser?.last_seen_at ?? null,
        })
      }

      conversationsData.sort((a, b) =>
        new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
      )

      setConversations(conversationsData)
      lastFetchAt.current = Date.now()
    } catch (err) {
      console.error("[MESSAGES] Error:", err)
      if (isFirstLoad) setError(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations(true)

    // Safety: if loading is still true after 8s, force it off to prevent permanent spinner
    const safetyTimer = setTimeout(() => setLoading(false), 8000)

    const onVisible = () => { if (document.visibilityState === "visible") fetchConversations() }
    const onFocus   = () => fetchConversations()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(safetyTimer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchConversations])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now  = new Date()
    const diffH = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    if (diffH < 1)   return "Just now"
    if (diffH < 24)  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (diffH < 168) return date.toLocaleDateString([], { weekday: "short" })
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`)
  }

  const handleDeleteConversation = async (conversationId: string, otherUserId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/conversations?id=${encodeURIComponent(conversationId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setConversations(prev => prev.filter(c => c.id !== conversationId))
    } catch (err) {
      console.error("[MESSAGES] Error deleting conversation:", err)
      alert("Failed to delete conversation")
    }
  }

  const toggleConversationSelection = (convId: string) => {
    setSelectedConversations(prev => {
      const next = new Set(prev)
      next.has(convId) ? next.delete(convId) : next.add(convId)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedConversations(
      selectedConversations.size === conversations.length
        ? new Set()
        : new Set(conversations.map(c => c.id))
    )
  }

  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return
    setDeletingBulk(true)
    try {
      const params = [...selectedConversations].map(id => `id=${encodeURIComponent(id)}`).join("&")
      const res = await fetch(`/api/conversations?${params}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)))
      setSelectedConversations(new Set())
    } catch (err) {
      console.error("[MESSAGES] Error bulk deleting:", err)
      alert("Failed to delete some conversations")
    } finally {
      setDeletingBulk(false)
    }
  }

  const getJobStatusBadge = (job?: JobInfo) => {
    if (!job) return null
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      CONFIRMED:   { label: "Confirmed",   className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
      ACTIVE:      { label: "In Progress", className: "bg-purple-500/20 text-purple-400 border-purple-500/30",   icon: Play },
      COMPLETED:   { label: "Completed",   className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
      in_progress: { label: "In Progress", className: "bg-purple-500/20 text-purple-400 border-purple-500/30",   icon: Play },
      closed:      { label: "Completed",   className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
    }
    const status = ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(job.status ?? "")
      ? job.status!
      : job.matching_status ?? job.status
    const config = statusConfig[status ?? ""]
    if (!config) return null
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.className} text-[10px] px-1.5 py-0 h-5 border`}>
        <Icon className="w-2.5 h-2.5 mr-0.5" />
        {config.label}
      </Badge>
    )
  }

  const isUrgent   = (job?: JobInfo) => job?.urgency_type === "asap" || job?.urgency_type === "today"
  const isAccepted = (job?: JobInfo) => job?.matching_status === "closed" || job?.status === "closed"

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm">Loading messages…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-6 text-center max-w-sm w-full">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => fetchConversations(true)} className="bg-slate-700 hover:bg-slate-600 text-white">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const dashboardHref =
    userType === "professional" ? "/dashboard/professional" :
    userType === "company"      ? "/dashboard/company" :
    userType === "homeowner"    ? "/dashboard/homeowner" :
    userType === "contractor"   ? "/dashboard/contractor" : "/"

  return (
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-6">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            Messages
          </h1>
          <div className="w-16" />
        </div>

        {/* Action Bar */}
        {conversations.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={toggleSelectAll}
            >
              {selectedConversations.size === conversations.length ? "Deselect all" : "Select all"}
            </Button>
            {selectedConversations.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-9 bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
                disabled={deletingBulk}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedConversations.size})
              </Button>
            )}
          </div>
        )}

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-8">
            <div className="text-center text-slate-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium text-slate-300 mb-1">No conversations yet</h3>
              <p className="text-sm">Start messaging to see your conversations here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.slice(0, visibleCount).map((conversation) => {
              const urgent     = isUrgent(conversation.job)
              const accepted   = isAccepted(conversation.job)
              const isSelected = selectedConversations.has(conversation.id)
              const hasUnread  = conversation.unread_count > 0 && conversation.last_message.sender_id !== cachedUser.current?.id

              return (
                <div
                  key={conversation.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-emerald-500/20 border border-emerald-500/40"
                      : hasUnread
                        ? "bg-slate-800 border border-emerald-500/30 hover:bg-slate-700/80"
                        : urgent
                          ? "bg-slate-800/80 border border-orange-500/30 hover:bg-slate-700/80"
                          : accepted
                            ? "bg-slate-800/60 border border-emerald-500/20 hover:bg-slate-700/80"
                            : "bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80"
                  }`}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  {/* Checkbox */}
                  <div className="mr-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleConversationSelection(conversation.id)}
                      className="h-5 w-5 border-2 border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>

                  {/* Avatar + presence dot */}
                  <div className="relative mr-3 flex-shrink-0">
                    <Avatar className="h-10 w-10 border border-slate-600">
                      <AvatarImage src={conversation.other_user.profile_photo_url} />
                      <AvatarFallback className="bg-slate-700 text-slate-300">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <StatusDot
                      lastSeenAt={conversation.other_user_last_seen}
                      className="absolute bottom-0 right-0 ring-2 ring-slate-800"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${hasUnread ? "font-bold text-white" : "font-medium text-slate-200"}`}>
                        {conversation.other_user.name}
                      </span>
                      {urgent && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[9px] px-1.5 py-0 h-4">
                          ASAP
                        </Badge>
                      )}
                    </div>

                    {conversation.job && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Briefcase className="h-3 w-3 text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-400 truncate">{conversation.job.title}</span>
                        {getJobStatusBadge(conversation.job)}
                      </div>
                    )}
                    {!conversation.job && conversation.subject && (
                      <p className="text-xs text-slate-500 truncate mb-0.5">{conversation.subject}</p>
                    )}

                    <p className={`text-xs truncate ${hasUnread ? "text-slate-300" : "text-slate-500"}`}>
                      {conversation.last_message.content}
                    </p>
                  </div>

                  {/* Time + unread badge */}
                  <div className="ml-2 flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-500">
                      {formatDate(conversation.last_message.created_at)}
                    </span>
                    {conversation.unread_count > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}

            {visibleCount < conversations.length && (
              <button
                onClick={() => setVisibleCount(v => v + 20)}
                className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                Load more ({conversations.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </div>

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
