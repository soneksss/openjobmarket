"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageCircle,
  Clock,
  User,
  FileText,
  Bell,
  ChevronDown,
  ChevronRight,
  Building2,
  Briefcase
} from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTranslation } from "@/lib/i18n/context"

interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_photo?: string
  last_message: string
  last_message_at: string
  unread_count: number
}

interface PendingApplication {
  id: string
  job_id: string
  job_title: string
  applicant_id: string
  applicant_name: string
  applicant_photo?: string
  applicant_type: "professional" | "company"
  applied_at: string
  status: string
}

interface DashboardInboxProps {
  userId: string
  userType: "company" | "professional" | "homeowner" | "contractor"
}

export function DashboardInbox({ userId, userType }: DashboardInboxProps) {
  const { locale } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([])
  const supabase = createClient()

  // Detect if on Portuguese route
  const isOnBrRoute = locale === 'pt-BR'
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  useEffect(() => {
    fetchInboxData()
  }, [userId])

  const fetchInboxData = async () => {
    try {
      // Fetch recent conversations (grouped by other user)
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100)

      if (!messagesError && messagesData) {
        // Group by conversation partner
        const conversationMap = new Map<string, Conversation>()

        for (const msg of messagesData) {
          const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
          const isUnread = msg.recipient_id === userId && !msg.is_read

          if (!conversationMap.has(otherId)) {
            conversationMap.set(otherId, {
              id: msg.conversation_id || otherId,
              other_user_id: otherId,
              other_user_name: "Loading...",
              last_message: msg.content?.substring(0, 80) + (msg.content?.length > 80 ? "..." : ""),
              last_message_at: msg.created_at,
              unread_count: isUnread ? 1 : 0,
            })
          } else if (isUnread) {
            const existing = conversationMap.get(otherId)!
            existing.unread_count += 1
          }
        }

        // Fetch user names for conversations
        const otherUserIds = Array.from(conversationMap.keys())
        if (otherUserIds.length > 0) {
          // Fetch from professional_profiles
          const { data: profProfiles } = await supabase
            .from("professional_profiles")
            .select("user_id, first_name, last_name, nickname, profile_photo_url")
            .in("user_id", otherUserIds)

          // Fetch from company_profiles
          const { data: companyProfiles } = await supabase
            .from("company_profiles")
            .select("user_id, company_name, logo_url")
            .in("user_id", otherUserIds)

          // Fetch from homeowner_profiles
          const { data: homeownerProfiles } = await supabase
            .from("homeowner_profiles")
            .select("user_id, first_name, last_name, nickname, profile_photo_url")
            .in("user_id", otherUserIds)

          // Update conversation names
          for (const [otherId, conv] of conversationMap) {
            const prof = profProfiles?.find(p => p.user_id === otherId)
            const comp = companyProfiles?.find(c => c.user_id === otherId)
            const home = homeownerProfiles?.find(h => h.user_id === otherId)

            if (prof) {
              conv.other_user_name = prof.nickname || `${prof.first_name} ${prof.last_name}`.trim() || "User"
              conv.other_user_photo = prof.profile_photo_url
            } else if (comp) {
              conv.other_user_name = comp.company_name || "Company"
              conv.other_user_photo = comp.logo_url
            } else if (home) {
              conv.other_user_name = home.nickname || `${home.first_name} ${home.last_name}`.trim() || "User"
              conv.other_user_photo = home.profile_photo_url
            }
          }
        }

        setConversations(Array.from(conversationMap.values()).slice(0, 5))
      }

      // Fetch pending applications (for job owners)
      if (userType === "company" || userType === "homeowner") {
        // First get user's jobs
        const jobsTable = userType === "homeowner" ? "homeowner_jobs" : "jobs"
        const { data: userJobs } = await supabase
          .from(jobsTable)
          .select("id, title")
          .eq("user_id", userId)

        if (userJobs && userJobs.length > 0) {
          const jobIds = userJobs.map(j => j.id)

          // Get pending applications for these jobs
          const { data: applications } = await supabase
            .from("job_applications")
            .select(`
              id,
              job_id,
              professional_id,
              company_id,
              applied_at,
              status,
              applicant_type
            `)
            .in("job_id", jobIds)
            .eq("status", "pending")
            .order("applied_at", { ascending: false })
            .limit(5)

          if (applications && applications.length > 0) {
            const pendingApps: PendingApplication[] = []

            for (const app of applications) {
              const job = userJobs.find(j => j.id === app.job_id)
              const applicantId = app.professional_id || app.company_id

              // Fetch applicant info
              let applicantName = "Applicant"
              let applicantPhoto = undefined

              if (app.applicant_type === "company" && app.company_id) {
                const { data: compProfile } = await supabase
                  .from("company_profiles")
                  .select("company_name, logo_url")
                  .eq("user_id", app.company_id)
                  .single()

                if (compProfile) {
                  applicantName = compProfile.company_name || "Company"
                  applicantPhoto = compProfile.logo_url
                }
              } else if (app.professional_id) {
                const { data: profProfile } = await supabase
                  .from("professional_profiles")
                  .select("first_name, last_name, nickname, profile_photo_url")
                  .eq("user_id", app.professional_id)
                  .single()

                if (profProfile) {
                  applicantName = profProfile.nickname || `${profProfile.first_name} ${profProfile.last_name}`.trim() || "Professional"
                  applicantPhoto = profProfile.profile_photo_url
                }
              }

              pendingApps.push({
                id: app.id,
                job_id: app.job_id,
                job_title: job?.title || "Job",
                applicant_id: applicantId,
                applicant_name: applicantName,
                applicant_photo: applicantPhoto,
                applicant_type: app.applicant_type || "professional",
                applied_at: app.applied_at,
                status: app.status,
              })
            }

            setPendingApplications(pendingApps)
          }
        }
      }
    } catch (error) {
      console.error("[DASHBOARD-INBOX] Error fetching inbox data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0) + pendingApplications.length

  if (loading) {
    return (
      <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-xl">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Inbox</span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const hasContent = conversations.length > 0 || pendingApplications.length > 0

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-xl">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900">Inbox</span>
              </div>
              {totalUnread > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs px-2 py-0.5">
                  {totalUnread} new
                </Badge>
              )}
              <div className="text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            {!hasContent ? (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No new messages or applications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Pending Applications Section */}
                {pendingApplications.length > 0 && (
                  <div className="px-4 py-2 bg-amber-50/50">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-2">
                      New Applications
                    </p>
                    {pendingApplications.map((app) => (
                      <Link
                        key={app.id}
                        href={getLocalePath(`/jobs/${app.job_id}?tab=applications`)}
                        className="flex items-center gap-3 py-2 hover:bg-amber-100/50 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={app.applicant_photo} />
                          <AvatarFallback className="bg-amber-100 text-amber-700">
                            {app.applicant_type === "company" ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {app.applicant_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            Applied to: {app.job_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(app.applied_at)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Conversations Section */}
                {conversations.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Recent Conversations
                    </p>
                    {conversations.map((conv) => (
                      <Link
                        key={conv.id}
                        href={getLocalePath(`/messages/${conv.other_user_id}`)}
                        className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={conv.other_user_photo} />
                            <AvatarFallback className="bg-gray-100 text-gray-600">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {conv.other_user_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {conv.last_message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(conv.last_message_at)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* View All Link */}
                <div className="px-4 py-3 bg-gray-50/50">
                  <Link
                    href={getLocalePath("/messages")}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View all messages →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
