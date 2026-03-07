"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Edit,
  Plus,
  FileText,
  AlertCircle,
  Loader2,
  MoreVertical,
  Trash2,
  PauseCircle,
  PlayCircle,
  CalendarPlus,
  Zap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface HomeownerJob {
  id: string
  title: string
  description: string
  short_description?: string
  location: string
  salary_min?: number
  salary_max?: number
  salary_frequency?: string
  is_active: boolean
  expires_at?: string
  urgency_type?: "asap" | "today" | "flexible" | null
  created_at: string
  updated_at?: string
  is_tradespeople_job?: boolean
  work_location?: string
  applications_count?: number
  views_count?: number
  accepted_contractor_id?: string
  completion_status?: string
}

interface Application {
  id: string
  status: string
  applied_at: string
  cover_letter?: string
  professional_id: string
  professional_profiles?: {
    id: string
    first_name: string
    last_name: string
    title?: string
    location?: string
    profile_photo_url?: string
    experience_level?: string
    bio?: string
    user_id: string
  }
}

interface JobCentricDashboardProps {
  jobs: HomeownerJob[]
  ownerId: string
  ownerUserId: string
  userType: 'homeowner' | 'company'
  stats: {
    totalJobs: number
    activeJobs: number
    completedJobs?: number
  }
}

export function JobCentricDashboard({ jobs, ownerId, ownerUserId, userType, stats }: JobCentricDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // State for expansion levels
  const [isJobListExpanded, setIsJobListExpanded] = useState(false)
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set())
  const [showApplicantsForJob, setShowApplicantsForJob] = useState<Set<string>>(new Set())
  const [expandedApplicantIds, setExpandedApplicantIds] = useState<Set<string>>(new Set())

  // State for applicants data (loaded on demand)
  const [jobApplications, setJobApplications] = useState<Record<string, Application[]>>({})
  const [loadingApplications, setLoadingApplications] = useState<Set<string>>(new Set())

  // State for actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [pendingAccept, setPendingAccept] = useState<{
    applicationId: string
    professionalId: string
    applicantName: string
    jobId: string
    jobTitle: string
  } | null>(null)

  // State for job management dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [extendDuration, setExtendDuration] = useState<number>(7) // Default 7 days
  const [pendingJobAction, setPendingJobAction] = useState<{
    jobId: string
    jobTitle: string
  } | null>(null)

  // Helper functions
  const getStatusInfo = (job: HomeownerJob) => {
    const now = new Date()
    const expiresAt = job.expires_at ? new Date(job.expires_at) : null
    const isExpired = expiresAt && expiresAt < now

    if (job.completion_status === 'completed') {
      return { text: "Completed", color: "bg-purple-100 text-purple-800", icon: CheckCircle }
    }
    if (job.completion_status === 'accepted') {
      return { text: "In Progress", color: "bg-blue-100 text-blue-800", icon: Clock }
    }
    if (!job.is_active || isExpired) {
      return { text: "Expired", color: "bg-gray-100 text-gray-800", icon: AlertCircle }
    }
    return { text: "Active", color: "bg-green-100 text-green-800", icon: Clock }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `From £${min.toLocaleString()}`
    if (max) return `Up to £${max.toLocaleString()}`
    return null
  }

  // Calculate time remaining for urgency-based jobs
  const getTimeRemaining = (expiresAt?: string, urgencyType?: string | null) => {
    if (!expiresAt || !urgencyType) return null

    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now

    if (diff <= 0) {
      return { text: "Expired", isExpired: true }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return { text: `${days}d ${hours}h left`, isExpired: false }
    } else if (hours > 0) {
      return { text: `${hours}h ${minutes}m left`, isExpired: false }
    } else if (minutes > 0) {
      return { text: `${minutes}m left`, isExpired: false }
    } else {
      return { text: "<1m left", isExpired: false }
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-slate-100 text-slate-800"
      case "reviewed": return "bg-blue-100 text-blue-800"
      case "interview": return "bg-purple-100 text-purple-800"
      case "accepted": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Toggle job expansion (shows job details only, not applicants)
  const toggleJobExpanded = (jobId: string) => {
    const newExpanded = new Set(expandedJobIds)

    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId)
      // Also hide applicants and collapse any expanded applicants for this job
      const newShowApplicants = new Set(showApplicantsForJob)
      newShowApplicants.delete(jobId)
      setShowApplicantsForJob(newShowApplicants)
      const newApplicantExpanded = new Set(expandedApplicantIds)
      jobApplications[jobId]?.forEach(app => newApplicantExpanded.delete(app.id))
      setExpandedApplicantIds(newApplicantExpanded)
    } else {
      newExpanded.add(jobId)
    }

    setExpandedJobIds(newExpanded)
  }

  // Toggle applicants visibility for a job (separate from job expansion)
  const toggleApplicantsVisible = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger job expansion

    const newShowApplicants = new Set(showApplicantsForJob)

    if (newShowApplicants.has(jobId)) {
      newShowApplicants.delete(jobId)
      // Collapse any expanded applicants for this job
      const newApplicantExpanded = new Set(expandedApplicantIds)
      jobApplications[jobId]?.forEach(app => newApplicantExpanded.delete(app.id))
      setExpandedApplicantIds(newApplicantExpanded)
    } else {
      newShowApplicants.add(jobId)
      // Load applications if not already loaded
      if (!jobApplications[jobId] && !loadingApplications.has(jobId)) {
        await loadApplicationsForJob(jobId)
      }
    }

    setShowApplicantsForJob(newShowApplicants)
  }

  // Toggle applicant expansion
  const toggleApplicantExpanded = (applicantId: string) => {
    const newExpanded = new Set(expandedApplicantIds)
    if (newExpanded.has(applicantId)) {
      newExpanded.delete(applicantId)
    } else {
      newExpanded.add(applicantId)
    }
    setExpandedApplicantIds(newExpanded)
  }

  // Load applications for a specific job
  const loadApplicationsForJob = async (jobId: string) => {
    setLoadingApplications(prev => new Set(prev).add(jobId))

    try {
      // Step 1: Fetch applications with professional_id only
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("job_applications")
        .select(`
          id,
          status,
          applied_at,
          cover_letter,
          professional_id
        `)
        .eq("job_id", jobId)
        .order("applied_at", { ascending: false })

      if (applicationsError) throw applicationsError

      if (!applicationsData || applicationsData.length === 0) {
        setJobApplications(prev => ({
          ...prev,
          [jobId]: []
        }))
        return
      }

      // Step 2: Get unique professional IDs
      const professionalIds = applicationsData
        .filter(app => app.professional_id)
        .map(app => app.professional_id)

      // Step 3: Fetch professional profiles
      let professionalProfiles: Record<string, any> = {}
      if (professionalIds.length > 0) {
        const { data: professionals } = await supabase
          .from("professional_profiles")
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            title,
            location,
            profile_photo_url,
            experience_level,
            bio
          `)
          .in("id", professionalIds)

        if (professionals) {
          professionalProfiles = professionals.reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Step 4: Combine data
      const transformedData: Application[] = applicationsData.map((app) => ({
        ...app,
        professional_id: app.professional_id || '',
        professional_profiles: app.professional_id ? professionalProfiles[app.professional_id] : undefined,
      }))

      setJobApplications(prev => ({
        ...prev,
        [jobId]: transformedData
      }))
    } catch (error) {
      console.error("[JOB-CENTRIC] Error loading applications:", error)
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingApplications(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  // Accept applicant
  const handleAcceptApplicant = async () => {
    if (!pendingAccept) return

    const { applicationId, professionalId, applicantName, jobId, jobTitle } = pendingAccept
    setActionLoading(applicationId)

    try {
      // Update the job to set this professional as accepted
      const { error: jobError } = await supabase
        .from("jobs")
        .update({
          accepted_contractor_id: professionalId, // Using same field name for compatibility
          completion_status: 'accepted',
          status: 'accepted'
        })
        .eq("id", jobId)

      if (jobError) throw jobError

      // Update this application to accepted
      const { error: acceptError } = await supabase
        .from("job_applications")
        .update({ status: "accepted" })
        .eq("id", applicationId)

      if (acceptError) throw acceptError

      // Reject all other applications for this job
      await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("job_id", jobId)
        .neq("id", applicationId)

      // Get professional's user_id for messaging
      const { data: professionalData } = await supabase
        .from("professional_profiles")
        .select("user_id")
        .eq("id", professionalId)
        .single()

      // Create notification and message
      if (professionalData?.user_id) {
        const budget = formatBudget(
          jobs.find(j => j.id === jobId)?.salary_min,
          jobs.find(j => j.id === jobId)?.salary_max
        )

        // Create notification
        await supabase.from("notifications").insert({
          user_id: professionalData.user_id,
          type: "application_status_change",
          title: "Application Accepted!",
          message: `🎉 Your application for "${jobTitle}"${budget ? ` (budget: ${budget})` : ''} has been accepted!`,
          link_url: `/applications/${applicationId}`,
          is_read: false,
        })

        // Send acceptance message
        await supabase.from('messages').insert({
          sender_id: ownerUserId,
          recipient_id: professionalData.user_id,
          subject: `Application Accepted: ${jobTitle}`,
          content: `🎉 Congratulations! Your application for "${jobTitle}"${budget ? ` (budget: ${budget})` : ''} has been accepted!\n\nPlease reply to discuss further details.`,
          message_type: 'direct',
          job_id: jobId,
          is_read: false
        })
      }

      toast({
        title: "✅ Applicant Accepted",
        description: `${applicantName} has been accepted for this job.`,
      })

      // Reload applications for this job
      await loadApplicationsForJob(jobId)
      router.refresh()

      // Navigate to messages
      if (professionalData?.user_id) {
        setTimeout(() => {
          router.push(`/messages/${professionalData.user_id}`)
        }, 1500)
      }
    } catch (error: any) {
      console.error("[JOB-CENTRIC] Error accepting applicant:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to accept applicant. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
      setShowAcceptDialog(false)
      setPendingAccept(null)
    }
  }

  // Reject applicant
  const handleRejectApplicant = async (applicationId: string, applicantName: string, jobId: string) => {
    setActionLoading(applicationId)

    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId)

      if (error) throw error

      toast({
        title: "Application Rejected",
        description: `${applicantName}'s application has been rejected.`,
      })

      // Reload applications for this job
      await loadApplicationsForJob(jobId)
    } catch (error: any) {
      console.error("[JOB-CENTRIC] Error rejecting application:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to reject application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Delete job
  const handleDeleteJob = async () => {
    if (!pendingJobAction) return

    const { jobId, jobTitle } = pendingJobAction
    setActionLoading(jobId)

    try {
      // First delete all applications for this job
      await supabase
        .from("job_applications")
        .delete()
        .eq("job_id", jobId)

      // Then delete the job
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId)

      if (error) throw error

      toast({
        title: "Job Deleted",
        description: `"${jobTitle}" has been deleted.`,
      })

      router.refresh()
    } catch (error: any) {
      console.error("[JOB-CENTRIC] Error deleting job:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
      setShowDeleteDialog(false)
      setPendingJobAction(null)
    }
  }

  // Toggle job active status (deactivate/activate)
  const handleToggleJobStatus = async (jobId: string, jobTitle: string, currentStatus: boolean) => {
    setActionLoading(jobId)

    try {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active: !currentStatus })
        .eq("id", jobId)

      if (error) throw error

      toast({
        title: currentStatus ? "Job Deactivated" : "Job Activated",
        description: `"${jobTitle}" has been ${currentStatus ? "deactivated" : "activated"}.`,
      })

      router.refresh()
    } catch (error: any) {
      console.error("[JOB-CENTRIC] Error toggling job status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update job status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Extend job expiration by selected duration
  const handleExtendJob = async () => {
    if (!pendingJobAction) return

    const { jobId, jobTitle } = pendingJobAction
    setActionLoading(jobId)

    try {
      // Get current job to check expiration date
      const { data: job } = await supabase
        .from("jobs")
        .select("expires_at")
        .eq("id", jobId)
        .single()

      // Calculate new expiration date (selected days from now or from current expiration, whichever is later)
      const now = new Date()
      const currentExpiration = job?.expires_at ? new Date(job.expires_at) : now
      const baseDate = currentExpiration > now ? currentExpiration : now
      const newExpiration = new Date(baseDate)
      newExpiration.setDate(newExpiration.getDate() + extendDuration)

      const { error } = await supabase
        .from("jobs")
        .update({
          expires_at: newExpiration.toISOString(),
          is_active: true // Also reactivate if it was inactive
        })
        .eq("id", jobId)

      if (error) throw error

      // Format duration text for toast
      const durationText = extendDuration === 7 ? "1 week"
        : extendDuration === 14 ? "2 weeks"
        : extendDuration === 21 ? "3 weeks"
        : extendDuration === 28 ? "4 weeks"
        : `${extendDuration} days`

      toast({
        title: "Job Extended",
        description: `"${jobTitle}" has been extended by ${durationText}.`,
      })

      router.refresh()
    } catch (error: any) {
      console.error("[JOB-CENTRIC] Error extending job:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to extend job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
      setShowExtendDialog(false)
      setPendingJobAction(null)
      setExtendDuration(7) // Reset to default
    }
  }

  // Display all jobs when expanded, otherwise show first 5
  const displayedJobs = isJobListExpanded ? jobs : jobs.slice(0, 5)

  return (
    <Card className="overflow-hidden border border-blue-500/30 shadow-sm rounded-xl bg-slate-800">
      <Collapsible open={isJobListExpanded} onOpenChange={setIsJobListExpanded}>
        {/* Header - Clickable to expand/collapse */}
        <CollapsibleTrigger asChild>
          <CardHeader className="px-4 py-3 cursor-pointer hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/30">
                <Briefcase className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Your Posted Jobs</span>
                  <span className="text-xs text-slate-400">
                    {stats.activeJobs} active{stats.completedJobs !== undefined ? `, ${stats.completedJobs} completed` : ''}
                  </span>
                </div>
              </div>
              <Badge className="bg-blue-500/30 text-blue-300 border-0 text-xs px-2 py-0.5">{stats.totalJobs}</Badge>
              <div className="text-slate-400">
                {isJobListExpanded ? (
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
            {jobs.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 px-4">
                <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-white">No jobs posted yet</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Post your first job to find contractors and professionals
                </p>
                <Link href={`/dashboard/${userType}/post-job`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Post Your First Job
                  </Button>
                </Link>
              </div>
            ) : (
              /* Job List */
              <div className="divide-y divide-slate-700">
                {displayedJobs.map((job) => {
              const statusInfo = getStatusInfo(job)
              const StatusIcon = statusInfo.icon
              const isExpanded = expandedJobIds.has(job.id)
              const applications = jobApplications[job.id] || []
              const isLoadingApps = loadingApplications.has(job.id)
              const budget = formatBudget(job.salary_min, job.salary_max)

              return (
                <Collapsible key={job.id} open={isExpanded} onOpenChange={() => toggleJobExpanded(job.id)}>
                  {/* Level 1: Compact Job Row */}
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Expand Icon */}
                        <div className="flex-shrink-0 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </div>

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm sm:text-base truncate text-white">{job.title}</h3>
                            {job.is_tradespeople_job ? (
                              <Badge className="bg-orange-500/30 text-orange-300 text-xs">
                                Trade Job
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/30 text-green-300 text-xs">
                                Vacancy
                              </Badge>
                            )}
                            <Badge className={`${statusInfo.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.text}
                            </Badge>
                            {/* Urgency Timer for Trade Jobs */}
                            {job.is_tradespeople_job && job.urgency_type && (() => {
                              const timeInfo = getTimeRemaining(job.expires_at, job.urgency_type)
                              if (!timeInfo) return null
                              return (
                                <Badge
                                  className={`text-xs ${
                                    timeInfo.isExpired
                                      ? "bg-slate-600 text-slate-400"
                                      : job.urgency_type === "asap"
                                      ? "bg-red-500/30 text-red-300 animate-pulse"
                                      : job.urgency_type === "today"
                                      ? "bg-orange-500/30 text-orange-300"
                                      : "bg-blue-500/30 text-blue-300"
                                  }`}
                                >
                                  {job.urgency_type === "asap" && <Zap className="h-2.5 w-2.5 mr-1" />}
                                  {job.urgency_type === "today" && <Clock className="h-2.5 w-2.5 mr-1" />}
                                  {job.urgency_type === "flexible" && <Calendar className="h-2.5 w-2.5 mr-1" />}
                                  {timeInfo.text}
                                </Badge>
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[100px] text-[0.65rem]">{job.location}</span>
                            </span>
                            {budget && (
                              <span className="text-emerald-400 font-medium">
                                {budget}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Applicants Count + Edit */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Applicants Badge - Clickable to show/hide applicants */}
                        <button
                          onClick={(e) => toggleApplicantsVisible(job.id, e)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            showApplicantsForJob.has(job.id)
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-blue-500/30 text-blue-300 hover:bg-blue-500/50 hover:scale-110 hover:shadow-md cursor-pointer'
                          }`}
                          title="Click to view applicants"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{job.applications_count || 0}</span>
                        </button>

                        {/* Job Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-700">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem asChild className="text-slate-200 focus:bg-slate-700 focus:text-white">
                              <Link href={`/dashboard/${userType}/jobs/${job.id}`} className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Job
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleJobStatus(job.id, job.title, job.is_active)}
                              disabled={actionLoading === job.id}
                              className="text-slate-200 focus:bg-slate-700 focus:text-white"
                            >
                              {job.is_active ? (
                                <>
                                  <PauseCircle className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPendingJobAction({ jobId: job.id, jobTitle: job.title })
                                setExtendDuration(7) // Reset to default when opening
                                setShowExtendDialog(true)
                              }}
                              className="text-slate-200 focus:bg-slate-700 focus:text-white"
                            >
                              <CalendarPlus className="h-4 w-4 mr-2" />
                              Extend Job
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400 focus:bg-slate-700"
                              onClick={() => {
                                setPendingJobAction({ jobId: job.id, jobTitle: job.title })
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Job
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Level 2: Expanded Job Details */}
                  <CollapsibleContent>
                    <div className="px-3 sm:px-4 pb-4 bg-slate-700/30 border-t border-slate-700">
                      {/* Job Details */}
                      <div className="py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                            <p className="text-xs text-slate-400">Posted</p>
                            <p className="text-sm font-medium text-white">{formatDate(job.created_at)}</p>
                          </div>
                          <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                            <p className="text-xs text-slate-400">Views</p>
                            <p className="text-sm font-medium text-white flex items-center gap-1">
                              <Eye className="h-3 w-3" />{job.views_count || 0}
                            </p>
                          </div>
                          <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                            <p className="text-xs text-slate-400">Type</p>
                            <p className="text-sm font-medium text-white">{job.work_location || 'On-site'}</p>
                          </div>
                          <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                            <p className="text-xs text-slate-400">Expires</p>
                            <p className="text-sm font-medium text-white">
                              {job.expires_at ? formatDate(job.expires_at) : 'No expiry'}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {job.short_description && (
                          <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                            <p className="text-xs text-slate-400 mb-1">Description</p>
                            <p className="text-sm text-slate-200">{job.short_description}</p>
                          </div>
                        )}

                        {/* Click to view applicants hint */}
                        {!showApplicantsForJob.has(job.id) && (job.applications_count || 0) > 0 && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={(e) => toggleApplicantsVisible(job.id, e)}
                              className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 mx-auto"
                            >
                              <Users className="h-4 w-4" />
                              Click to view {job.applications_count} applicant{(job.applications_count || 0) !== 1 ? 's' : ''}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>

                  {/* Level 3: Applicants Section - Only shown when applicant badge is clicked */}
                  {showApplicantsForJob.has(job.id) && (
                    <div className="px-3 sm:px-4 pb-4 bg-blue-500/10 border-t border-slate-700">
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2 text-white">
                            <Users className="h-4 w-4 text-blue-400" />
                            Applicants ({applications.length})
                          </h4>
                          <button
                            onClick={(e) => toggleApplicantsVisible(job.id, e)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Hide
                          </button>
                        </div>

                        {isLoadingApps ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                          </div>
                        ) : applications.length === 0 ? (
                          <div className="text-center py-8 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <FileText className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
                            <p className="text-sm text-slate-400">No applications yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {applications.map((application) => {
                              const professionalProfile = application.professional_profiles

                              if (!professionalProfile) return null

                              const applicantName = `${professionalProfile.first_name} ${professionalProfile.last_name}`
                              const applicantTitle = professionalProfile.title
                              const applicantPhoto = professionalProfile.profile_photo_url
                              const isApplicantExpanded = expandedApplicantIds.has(application.id)
                              const isAccepted = job.accepted_contractor_id === application.professional_id
                              const isRejected = application.status === 'rejected'
                              const canTakeAction = !isAccepted && !isRejected && !job.accepted_contractor_id

                              return (
                                <Collapsible
                                  key={application.id}
                                  open={isApplicantExpanded}
                                  onOpenChange={() => toggleApplicantExpanded(application.id)}
                                >
                                  {/* Applicant Row */}
                                  <div className={`bg-slate-700/50 rounded-lg border border-slate-600/50 overflow-hidden ${
                                    isAccepted ? 'ring-2 ring-green-500' : ''
                                  }`}>
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center gap-3 p-3 hover:bg-slate-600/50 cursor-pointer transition-colors">
                                        {/* Expand Icon */}
                                        <div className="flex-shrink-0 text-slate-400">
                                          {isApplicantExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </div>

                                        {/* Avatar */}
                                        <Avatar className="h-10 w-10 flex-shrink-0 border border-slate-500">
                                          <AvatarImage src={applicantPhoto} alt={applicantName} />
                                          <AvatarFallback className="text-xs bg-slate-600 text-slate-200">
                                            {applicantName?.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm truncate text-white">{applicantName}</span>
                                            <Badge className={`${getApplicationStatusColor(application.status)} text-xs`}>
                                              {application.status}
                                            </Badge>
                                            {isAccepted && (
                                              <Badge className="bg-green-600 text-white text-xs">Selected</Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-400 truncate">
                                            {applicantTitle || 'Professional'}
                                          </p>
                                        </div>

                                        {/* Quick Action Icons */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {canTakeAction && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/20"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setPendingAccept({
                                                    applicationId: application.id,
                                                    professionalId: application.professional_id,
                                                    applicantName: applicantName,
                                                    jobId: job.id,
                                                    jobTitle: job.title,
                                                  })
                                                  setShowAcceptDialog(true)
                                                }}
                                                disabled={actionLoading === application.id}
                                              >
                                                <CheckCircle className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleRejectApplicant(application.id, applicantName, job.id)
                                                }}
                                                disabled={actionLoading === application.id}
                                              >
                                                <XCircle className="h-4 w-4" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    {/* Level 4: Expanded Applicant Details */}
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3 pt-0 border-t border-slate-600 bg-slate-600/30">
                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-2 py-3">
                                          <div>
                                            <p className="text-xs text-slate-400">Location</p>
                                            <p className="text-xs text-white flex items-center gap-1">
                                              <MapPin className="h-2.5 w-2.5" />
                                              {professionalProfile.location || 'Not specified'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-400">Applied</p>
                                            <p className="text-sm text-white flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {formatDate(application.applied_at)}
                                            </p>
                                          </div>
                                          {professionalProfile.experience_level && (
                                            <div>
                                              <p className="text-xs text-slate-400">Experience</p>
                                              <p className="text-sm text-white">{professionalProfile.experience_level}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Cover Letter */}
                                        {application.cover_letter && (
                                          <div className="bg-slate-700/50 p-3 rounded-lg mb-3 border border-slate-600/50">
                                            <p className="text-xs text-slate-400 mb-1">Cover Letter</p>
                                            <p className="text-sm text-slate-200 whitespace-pre-wrap">
                                              {application.cover_letter}
                                            </p>
                                          </div>
                                        )}

                                        {/* Bio */}
                                        {professionalProfile.bio && (
                                          <div className="bg-slate-700/50 p-3 rounded-lg mb-3 border border-slate-600/50">
                                            <p className="text-xs text-slate-400 mb-1">About</p>
                                            <p className="text-sm text-slate-200">{professionalProfile.bio}</p>
                                          </div>
                                        )}

                                        {/* Action Buttons - Sticky on mobile */}
                                        <div className="sticky bottom-0 bg-slate-600/30 pt-2 -mx-3 px-3 pb-1 border-t border-slate-600 mt-2">
                                          <div className="flex gap-2">
                                            {canTakeAction ? (
                                              <>
                                                <Button
                                                  size="sm"
                                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                                  onClick={() => {
                                                    setPendingAccept({
                                                      applicationId: application.id,
                                                      professionalId: application.professional_id,
                                                      applicantName: applicantName,
                                                      jobId: job.id,
                                                      jobTitle: job.title,
                                                    })
                                                    setShowAcceptDialog(true)
                                                  }}
                                                  disabled={actionLoading === application.id}
                                                >
                                                  {actionLoading === application.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                  ) : (
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                  )}
                                                  Accept
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                                  onClick={() => handleRejectApplicant(application.id, applicantName, job.id)}
                                                  disabled={actionLoading === application.id}
                                                >
                                                  <XCircle className="h-4 w-4 mr-1" />
                                                  Reject
                                                </Button>
                                              </>
                                            ) : isAccepted ? (
                                              <Button
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => {
                                                  if (professionalProfile.user_id) router.push(`/messages/${professionalProfile.user_id}`)
                                                }}
                                              >
                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                Message
                                              </Button>
                                            ) : null}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              asChild
                                              className="border-slate-500 text-slate-200 hover:bg-slate-600"
                                            >
                                              <Link href={`/professionals/${professionalProfile.id}`}>
                                                View Profile
                                              </Link>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Collapsible>
              )
            })}
          </div>
        )}

          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Applicant?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span>Are you sure you want to accept <strong>{pendingAccept?.applicantName}</strong> for this job?</span>
                <div className="mt-3">This will:</div>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Mark this applicant as accepted</li>
                  <li>Automatically reject all other applications</li>
                  <li>Open a conversation with the applicant</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptApplicant}
              disabled={!!actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Accepting...
                </>
              ) : (
                "Yes, Accept Applicant"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span>Are you sure you want to delete <strong>"{pendingJobAction?.jobTitle}"</strong>?</span>
                <div className="mt-3 text-red-600 font-medium">This action cannot be undone.</div>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All applications for this job will be deleted</li>
                  <li>The job listing will be permanently removed</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Job"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Confirmation Dialog */}
      <AlertDialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Job</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span>Select how long to extend <strong>"{pendingJobAction?.jobTitle}"</strong>:</span>

                {/* Duration Selection */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {[
                    { days: 3, label: "3 days" },
                    { days: 7, label: "1 week" },
                    { days: 14, label: "2 weeks" },
                    { days: 21, label: "3 weeks" },
                    { days: 28, label: "4 weeks" },
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setExtendDuration(option.days)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        extendDuration === option.days
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <ul className="list-disc list-inside mt-4 space-y-1 text-sm">
                  <li>The job expiration will be extended by the selected duration</li>
                  <li>If the job was inactive, it will be reactivated</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExtendJob}
              disabled={!!actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Extending...
                </>
              ) : (
                "Extend Job"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
