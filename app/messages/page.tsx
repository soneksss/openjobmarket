"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageCircle, Clock, User, ArrowLeft, Trash2, Star, Briefcase, CheckCircle, Play, AlertCircle } from "lucide-react"
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
  id: string // conversation_id from the conversations table
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
  other_user_last_seen?: string | null
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<"professional" | "company" | "homeowner" | "contractor" | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedUserToRate, setSelectedUserToRate] = useState<{userId: string, name: string} | null>(null)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    updatePresence() // best-effort, fire-and-forget
    try {
      console.log("[MESSAGES] Starting to fetch conversations...")

      // Get user (more reliable than getSession which can hang)
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error("[MESSAGES] Auth error:", authError)
        setError("Authentication error")
        setLoading(false)
        return
      }

      console.log("[MESSAGES] User from getUser:", currentUser?.id)

      if (!currentUser) {
        console.log("[MESSAGES] No user found")
        setError("Please log in to view messages")
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Get user type
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", currentUser.id)
        .single()

      if (userData) {
        setUserType(userData.user_type)
      }

      console.log("[MESSAGES] Fetching messages...")

      // Fetch all messages involving this user (limit for performance)
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          subject,
          content,
          created_at,
          is_read,
          sender_id,
          recipient_id,
          conversation_id,
          job_id
        `)
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })
        .limit(500)

      if (messagesError) {
        console.error("[MESSAGES] Error fetching messages:", messagesError)
        throw messagesError
      }

      console.log("[MESSAGES] Fetched", messages?.length || 0, "messages")

      // No messages - exit early
      if (!messages || messages.length === 0) {
        console.log("[MESSAGES] No messages found")
        setConversations([])
        setLoading(false)
        return
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, {
        messages: typeof messages,
        other_user_id: string
      }>()

      for (const message of messages) {
        const other_user_id = message.sender_id === currentUser.id
          ? message.recipient_id
          : message.sender_id

        if (!conversationMap.has(other_user_id)) {
          conversationMap.set(other_user_id, {
            messages: [],
            other_user_id
          })
        }

        conversationMap.get(other_user_id)!.messages.push(message)
      }

      // OPTIMIZATION: Batch fetch all user IDs at once instead of one by one
      const userIds = Array.from(conversationMap.keys()).filter(id => id && id !== 'undefined' && id !== 'null')

      if (userIds.length === 0) {
        setConversations([])
        setLoading(false)
        console.log("[MESSAGES] No valid user IDs found")
        return
      }

      console.log("[MESSAGES] Batch fetching", userIds.length, "users")

      // Fetch all users at once (1 query instead of N queries)
      const { data: users } = await supabase
        .from("users")
        .select("id, user_type, full_name, nickname, profile_photo_url, email, last_seen_at")
        .in("id", userIds)

      const usersMap = new Map(users?.map(u => [u.id, u]) || [])
      console.log("[MESSAGES] Fetched", usersMap.size, "user records")

      // Fetch all professional profiles at once
      const professionalIds = users?.filter(u => u.user_type === 'professional').map(u => u.id) || []
      const { data: professionalProfiles } = professionalIds.length > 0
        ? await supabase
            .from('professional_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', professionalIds)
        : { data: [] }

      const proProfilesMap = new Map(professionalProfiles?.map(p => [p.user_id, p]) || [])

      // Fetch all company profiles at once
      const companyIds = users?.filter(u => u.user_type === 'company').map(u => u.id) || []
      const { data: companyProfiles } = companyIds.length > 0
        ? await supabase
            .from('company_profiles')
            .select('user_id, company_name, logo_url')
            .in('user_id', companyIds)
        : { data: [] }

      const compProfilesMap = new Map(companyProfiles?.map(c => [c.user_id, c]) || [])

      // Fetch all homeowner profiles at once
      const homeownerIds = users?.filter(u => u.user_type === 'homeowner').map(u => u.id) || []
      const { data: homeownerProfiles } = homeownerIds.length > 0
        ? await supabase
            .from('homeowner_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', homeownerIds)
        : { data: [] }

      const homeownerProfilesMap = new Map(homeownerProfiles?.map(h => [h.user_id, h]) || [])

      // Fetch all contractor profiles at once
      const contractorIds = users?.filter(u => u.user_type === 'contractor').map(u => u.id) || []
      const { data: contractorProfiles } = contractorIds.length > 0
        ? await supabase
            .from('contractor_profiles')
            .select('user_id, company_name, profile_photo_url')
            .in('user_id', contractorIds)
        : { data: [] }

      const contractorProfilesMap = new Map(contractorProfiles?.map(c => [c.user_id, c]) || [])

      // Fetch job info for messages with job_id
      const jobIds = [...new Set(messages?.filter(m => m.job_id).map(m => m.job_id))]
      let jobsMap = new Map<string, JobInfo>()

      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title, matching_status, status, urgency_type')
          .in('id', jobIds)

        jobsMap = new Map(jobsData?.map(j => [j.id, j]) || [])
      }

      console.log("[MESSAGES] Profiles and jobs fetched - building conversations")

      // Now process all conversations with cached data (no more queries)
      const conversationsData: Conversation[] = []

      for (const [otherUserId, convData] of conversationMap) {
        const otherUser = usersMap.get(otherUserId)

        let displayName = 'Deleted User'
        let photoUrl: string | undefined = undefined

        if (otherUser) {
          displayName = otherUser.nickname || otherUser.full_name || otherUser.email || 'Unknown User'
          photoUrl = otherUser.profile_photo_url

          // Get profile-specific data from cached maps
          if (otherUser.user_type === 'professional') {
            const profData = proProfilesMap.get(otherUserId)
            if (profData) {
              const fullName = [profData.first_name, profData.last_name].filter(Boolean).join(' ')
              displayName = fullName || displayName
              photoUrl = profData.profile_photo_url || photoUrl
            }
          } else if (otherUser.user_type === 'company') {
            const compData = compProfilesMap.get(otherUserId)
            if (compData) {
              displayName = compData.company_name || displayName
              photoUrl = compData.logo_url || photoUrl
            }
          } else if (otherUser.user_type === 'homeowner') {
            const homeownerData = homeownerProfilesMap.get(otherUserId)
            if (homeownerData) {
              const fullName = [homeownerData.first_name, homeownerData.last_name].filter(Boolean).join(' ')
              displayName = fullName || displayName
              photoUrl = homeownerData.profile_photo_url || photoUrl
            }
          } else if (otherUser.user_type === 'contractor') {
            const contractorData = contractorProfilesMap.get(otherUserId)
            if (contractorData) {
              displayName = contractorData.company_name || displayName
              photoUrl = contractorData.profile_photo_url || photoUrl
            }
          }
        }

        const lastMessage = convData.messages[0]
        const unreadMessages = convData.messages.filter(
          msg => msg.recipient_id === currentUser.id && !msg.is_read
        )

        // Find job from any message in this conversation
        const messageWithJob = convData.messages.find(m => m.job_id)
        const jobInfo = messageWithJob?.job_id ? jobsMap.get(messageWithJob.job_id) : undefined

        conversationsData.push({
          id: otherUserId,
          other_user: {
            id: otherUserId,
            name: displayName,
            profile_photo_url: photoUrl
          },
          last_message: {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            is_read: lastMessage.is_read,
            sender_id: lastMessage.sender_id,
            job_id: lastMessage.job_id
          },
          unread_count: unreadMessages.length,
          job: jobInfo,
          other_user_last_seen: otherUser?.last_seen_at ?? null
        })
      }

      // Sort by most recent
      conversationsData.sort((a, b) =>
        new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
      )

      setConversations(conversationsData)
      console.log("[MESSAGES] Set", conversationsData.length, "conversations")
    } catch (error) {
      console.error("[MESSAGES] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`)
  }

  const handleDeleteConversation = async (otherUserId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening conversation

    if (!confirm("Delete this conversation? This cannot be undone.")) {
      return
    }

    try {
      // Delete all messages between current user and other user (both directions)
      const { error: messagesError1 } = await supabase
        .from("messages")
        .delete()
        .eq("sender_id", user.id)
        .eq("recipient_id", otherUserId)

      if (messagesError1) {
        console.error("[MESSAGES] Error deleting sent messages:", messagesError1)
      }

      const { error: messagesError2 } = await supabase
        .from("messages")
        .delete()
        .eq("sender_id", otherUserId)
        .eq("recipient_id", user.id)

      if (messagesError2) {
        console.error("[MESSAGES] Error deleting received messages:", messagesError2)
      }

      // Also try to delete any conversation records involving both users
      const { error: conversationError } = await supabase
        .from("conversations")
        .delete()
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)

      if (conversationError) {
        console.error("[MESSAGES] Error deleting conversation record:", conversationError)
        // Don't throw - messages are already deleted
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.other_user.id !== otherUserId))
    } catch (error) {
      console.error("[MESSAGES] Error deleting conversation:", error)
      alert("Failed to delete conversation")
    }
  }

  const toggleConversationSelection = (convId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(convId)) {
        newSet.delete(convId)
      } else {
        newSet.add(convId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedConversations.size === conversations.length) {
      setSelectedConversations(new Set())
    } else {
      setSelectedConversations(new Set(conversations.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return

    if (!confirm(`Delete ${selectedConversations.size} conversation${selectedConversations.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setDeletingBulk(true)
    try {
      for (const otherUserId of selectedConversations) {
        // Delete all messages between current user and other user (both directions)
        await supabase
          .from("messages")
          .delete()
          .eq("sender_id", user.id)
          .eq("recipient_id", otherUserId)

        await supabase
          .from("messages")
          .delete()
          .eq("sender_id", otherUserId)
          .eq("recipient_id", user.id)

        // Also try to delete conversation records
        await supabase
          .from("conversations")
          .delete()
          .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => !selectedConversations.has(conv.id)))
      setSelectedConversations(new Set())
    } catch (error) {
      console.error("[MESSAGES] Error bulk deleting:", error)
      alert("Failed to delete some conversations")
    } finally {
      setDeletingBulk(false)
    }
  }

  const getJobStatusBadge = (job?: JobInfo) => {
    if (!job) return null

    const status = job.matching_status || job.status

    // Dark theme badges
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      searching: { label: 'Searching', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
      reviewing: { label: 'Reviewing', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
      in_progress: { label: 'In Progress', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Play },
      closed: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      open: { label: 'Open', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
    }

    const config = statusConfig[status || 'open'] || statusConfig.open
    const Icon = config.icon

    return (
      <Badge variant="outline" className={`${config.className} text-[10px] px-1.5 py-0 h-5 border`}>
        <Icon className="w-2.5 h-2.5 mr-0.5" />
        {config.label}
      </Badge>
    )
  }

  const isUrgent = (job?: JobInfo) => {
    return job?.urgency_type === 'asap' || job?.urgency_type === 'today'
  }

  const isAccepted = (job?: JobInfo) => {
    return job?.matching_status === 'closed' || job?.status === 'closed'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto p-4 md:p-6">
          <div className="text-center text-slate-300 py-12">Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto p-4 md:p-6">
          <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-6">
            <div className="text-center text-red-400">
              <p>Error: {error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4 bg-slate-700 hover:bg-slate-600 text-white">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-6">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            asChild
          >
            <Link href={
              userType === "professional" ? "/dashboard/professional" :
              userType === "company" ? "/dashboard/company" :
              userType === "homeowner" ? "/dashboard/homeowner" :
              userType === "contractor" ? "/dashboard/contractor" :
              "/"
            }>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            Messages
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Action Bar - SpareRoom style */}
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
            {conversations.map((conversation) => {
              const urgent = isUrgent(conversation.job)
              const accepted = isAccepted(conversation.job)
              const isSelected = selectedConversations.has(conversation.id)
              const hasUnread = conversation.unread_count > 0 && conversation.last_message.sender_id !== user.id

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
                  {/* Checkbox - Always visible like SpareRoom */}
                  <div className="mr-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleConversationSelection(conversation.id)}
                      className="h-5 w-5 border-2 border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>

                  {/* Avatar + online dot */}
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
                    {/* Top row: Name + badges */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                        {conversation.other_user.name}
                      </span>
                      {urgent && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[9px] px-1.5 py-0 h-4">
                          ASAP
                        </Badge>
                      )}
                    </div>

                    {/* Job context row */}
                    {conversation.job && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Briefcase className="h-3 w-3 text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-400 truncate">{conversation.job.title}</span>
                        {getJobStatusBadge(conversation.job)}
                      </div>
                    )}

                    {/* Message preview */}
                    <p className={`text-xs truncate ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                      {conversation.last_message.content}
                    </p>
                  </div>

                  {/* Right side: time + unread */}
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
          </div>
        )}
      </div>

      {/* Rating Modal */}
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
