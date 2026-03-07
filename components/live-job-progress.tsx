"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Clock,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowRight,
  Phone,
  MessageCircle,
  Star,
  Zap,
  RefreshCw,
  Home,
  X,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/client"

interface JobData {
  id: string
  title: string
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  salaryMin: number | null
  salaryMax: number | null
  urgencyType: string | null
  searchState: string | null
  searchRadius: number
  createdAt: string
  expiresAt: string | null
}

interface Applicant {
  id: string
  name: string
  businessName?: string
  avatarUrl?: string
  rating: number
  reviewCount: number
  distanceMiles: number
  respondedAt: string
  verified: boolean
  type: "professional" | "contractor" | "company"
}

interface LiveJobProgressProps {
  job: JobData
  initialApplicationCount: number
  userType: string
  userId: string
}

// Timing constants based on urgency
const TIMING = {
  asap: {
    searchDurationMs: 10 * 60 * 1000, // 10 minutes
    pollIntervalMs: 3000, // 3 seconds
  },
  today: {
    searchDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    pollIntervalMs: 10000, // 10 seconds
  },
  flexible: {
    searchDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    pollIntervalMs: 30000, // 30 seconds
  },
}

export function LiveJobProgress({
  job,
  initialApplicationCount,
  userType,
  userId,
}: LiveJobProgressProps) {
  const router = useRouter()
  const supabase = createClient()

  // State - Default to "searching" for urgent jobs or new jobs, "background" for flexible
  const [searchState, setSearchState] = useState<"searching" | "found" | "timeout" | "background">(() => {
    // If explicitly set to active_search, use searching
    if (job.searchState === "active_search") return "searching"
    // If it's an urgent job type (ASAP or Today), start searching
    if (job.urgencyType === "asap" || job.urgencyType === "today") return "searching"
    // Otherwise, show background state
    return "background"
  })
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applicationCount, setApplicationCount] = useState(initialApplicationCount)
  const [notifiedCount, setNotifiedCount] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const timing = TIMING[job.urgencyType as keyof typeof TIMING] || TIMING.flexible
    const elapsed = Date.now() - new Date(job.createdAt).getTime()
    const remaining = Math.max(0, timing.searchDurationMs - elapsed)
    return Math.floor(remaining / 1000)
  })
  const [isExtending, setIsExtending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urgencyType = (job.urgencyType || "flexible") as keyof typeof TIMING
  const timing = TIMING[urgencyType] || TIMING.flexible

  // Format time remaining
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "0:00"
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Poll for applications
  const pollApplications = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/urgent-responses`, {
        credentials: 'include', // Ensure cookies are sent
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[LIVE-JOB] API error:", response.status, errorData)

        // Only show error for non-auth issues (user might need to re-login)
        if (response.status === 401) {
          setError("Session expired. Please refresh the page.")
        } else if (response.status === 403) {
          setError("You don't have permission to view this job's progress.")
        } else if (response.status >= 500) {
          // Don't show server errors to user, just log
          console.error("[LIVE-JOB] Server error, will retry")
        }
        return
      }

      const data = await response.json()
      console.log("[LIVE-JOB] API response:", data)

      // Clear any previous errors on success
      setError(null)

      if (data.responses && data.responses.length > 0) {
        setApplicants(
          data.responses.map((r: any) => ({
            id: r.id,
            name: r.name,
            businessName: r.business_name,
            avatarUrl: r.avatar_url,
            rating: r.rating || 4.5,
            reviewCount: r.review_count || 0,
            distanceMiles: r.distance_miles || 0,
            respondedAt: r.response_time || "Just now",
            verified: r.verified || false,
            type: r.type || "professional",
          }))
        )
        setApplicationCount(data.responses.length)

        // If we have responses and we're still searching, update state
        if (searchState === "searching") {
          setSearchState("found")
        }
      } else {
        // Update application count even if 0
        setApplicationCount(0)
      }

      if (data.notifiedCount !== undefined) {
        setNotifiedCount(data.notifiedCount)
      }
    } catch (err) {
      console.error("[LIVE-JOB] Error polling applications:", err)
    }
  }, [job.id, searchState])

  // Countdown timer
  useEffect(() => {
    if (searchState !== "searching") return

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timer expired
          if (applicants.length === 0) {
            setSearchState("timeout")
          } else {
            setSearchState("found")
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [searchState, applicants.length])

  // Polling effect
  useEffect(() => {
    // Initial poll
    pollApplications()

    // Set up polling interval
    const pollInterval = setInterval(pollApplications, timing.pollIntervalMs)

    return () => clearInterval(pollInterval)
  }, [pollApplications, timing.pollIntervalMs])

  // Real-time subscription for new applications
  useEffect(() => {
    console.log("[LIVE-JOB] Setting up real-time subscription for job:", job.id)

    const channel = supabase
      .channel(`job-applications-${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_applications",
          filter: `job_id=eq.${job.id}`,
        },
        (payload) => {
          console.log("[LIVE-JOB] New application received:", payload)
          // Refresh applications
          pollApplications()
        }
      )
      .subscribe((status) => {
        console.log("[LIVE-JOB] Subscription status:", status)
      })

    return () => {
      console.log("[LIVE-JOB] Cleaning up subscription")
      supabase.removeChannel(channel)
    }
  }, [job.id, supabase, pollApplications])

  // Extend search time
  const handleExtendSearch = async () => {
    setIsExtending(true)
    try {
      await supabase
        .from("jobs")
        .update({
          urgency_type: "today",
          search_state: "active_search",
        })
        .eq("id", job.id)

      // Reset timer for "today" duration
      setSecondsRemaining(TIMING.today.searchDurationMs / 1000)
      setSearchState("searching")
    } catch (err) {
      console.error("[LIVE-JOB] Error extending search:", err)
      setError("Failed to extend search. Please try again.")
    } finally {
      setIsExtending(false)
    }
  }

  // Convert to flexible
  const handleConvertToFlexible = async () => {
    try {
      await supabase
        .from("jobs")
        .update({
          urgency_type: null,
          search_state: null,
        })
        .eq("id", job.id)

      // Redirect to job details
      const dashboardPath =
        userType === "company" ? "/dashboard/company" : "/dashboard/homeowner"
      router.push(`${dashboardPath}/jobs/${job.id}`)
    } catch (err) {
      console.error("[LIVE-JOB] Error converting to flexible:", err)
      setError("Failed to update job. Please try again.")
    }
  }

  // Go to dashboard
  const handleGoToDashboard = () => {
    const dashboardPath =
      userType === "company" ? "/dashboard/company" : "/dashboard/homeowner"
    router.push(dashboardPath)
  }

  // Contact applicant
  const handleContact = (applicant: Applicant, method: "call" | "message") => {
    if (method === "message") {
      router.push(`/messages?to=${applicant.id}&job=${job.id}`)
    }
  }

  // Render searching state
  const renderSearching = () => (
    <div className="text-center space-y-6">
      {/* Radar Animation */}
      <div className="relative w-40 h-40 mx-auto">
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
        <div className="absolute inset-3 rounded-full bg-emerald-500/20 animate-ping animation-delay-200" />
        <div className="absolute inset-6 rounded-full bg-emerald-500/30 animate-ping animation-delay-400" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Search className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div>
        <h2 className="text-2xl font-bold text-white md:text-gray-900 mb-2">
          Looking for available tradespeople near you...
        </h2>
        <p className="text-slate-400 md:text-gray-600">
          Searching within {job.searchRadius} miles of {job.location}
        </p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400">{notifiedCount}</div>
          <div className="text-sm text-slate-400 md:text-gray-500">Tradespeople notified</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white md:text-gray-900">{formatTime(secondsRemaining)}</div>
          <div className="text-sm text-slate-400 md:text-gray-500">
            {urgencyType === "asap" ? "ASAP window" : "Search time"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{applicationCount}</div>
          <div className="text-sm text-slate-400 md:text-gray-500">Responses</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700 md:bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(100, (1 - secondsRemaining / (timing.searchDurationMs / 1000)) * 100)}%`,
          }}
        />
      </div>

      {/* Urgency Badge */}
      <Badge
        className={cn(
          "text-sm px-4 py-1.5",
          urgencyType === "asap"
            ? "bg-red-500/20 text-red-400 border-red-500/30"
            : urgencyType === "today"
            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
        )}
      >
        {urgencyType === "asap" && <Zap className="w-3 h-3 mr-1" />}
        {urgencyType === "today" && <Clock className="w-3 h-3 mr-1" />}
        {urgencyType === "asap"
          ? "ASAP - Emergency Priority"
          : urgencyType === "today"
          ? "Today - Same Day"
          : "Flexible Timing"}
      </Badge>

      {/* Info Text */}
      <p className="text-xs text-slate-500 md:text-gray-500 max-w-sm mx-auto">
        {urgencyType === "asap"
          ? "First tradesperson to respond can accept immediately. If no one responds, we'll expand the search."
          : "We'll notify you as soon as someone responds to your job."}
      </p>

      {/* Continue in Background */}
      <Button
        variant="ghost"
        className="text-slate-400 hover:text-white md:text-gray-500 md:hover:text-gray-900"
        onClick={handleGoToDashboard}
      >
        Continue in background
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )

  // Render found state (applicants available)
  const renderFound = () => (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white md:text-gray-900 mb-2">
          {applicants.length === 1
            ? "A tradesperson is available!"
            : `${applicants.length} tradespeople interested!`}
        </h2>
        <p className="text-slate-400 md:text-gray-600">
          {urgencyType === "asap"
            ? "Contact them now to confirm the job"
            : "Review their profiles and choose the best fit"}
        </p>
      </div>

      {/* Applicant Cards */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {applicants.map((applicant, index) => (
          <Card
            key={applicant.id}
            className={cn(
              "p-4 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200",
              urgencyType === "asap" && index === 0 && "ring-2 ring-emerald-500/50"
            )}
          >
            {urgencyType === "asap" && index === 0 && (
              <Badge className="mb-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                First to respond
              </Badge>
            )}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-slate-700 md:bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {applicant.avatarUrl ? (
                  <img
                    src={applicant.avatarUrl}
                    alt={applicant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-slate-300 md:text-gray-600">
                    {applicant.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white md:text-gray-900 truncate">
                    {applicant.businessName || applicant.name}
                  </h3>
                  {applicant.verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400 md:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {applicant.rating.toFixed(1)} ({applicant.reviewCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {applicant.distanceMiles.toFixed(1)} mi
                  </span>
                </div>

                <p className="text-sm text-emerald-400 mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {applicant.respondedAt}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleContact(applicant, "message")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button
                onClick={() => router.push(`/profile/${applicant.type}/${applicant.id}`)}
                variant="outline"
                className="flex-1 border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700 hover:bg-slate-700 md:hover:bg-gray-100"
              >
                View Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleGoToDashboard}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Go to Dashboard
        </Button>
        {searchState === "searching" && (
          <Button
            onClick={() => setSearchState("background")}
            variant="outline"
            className="flex-1 border-slate-600 md:border-gray-300"
          >
            Keep Searching
          </Button>
        )}
      </div>
    </div>
  )

  // Render timeout state (no responses)
  const renderTimeout = () => (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-amber-400" />
      </div>

      {/* Message */}
      <div>
        <h2 className="text-2xl font-bold text-white md:text-gray-900 mb-2">
          No one is available right now
        </h2>
        <p className="text-slate-400 md:text-gray-600 max-w-md mx-auto">
          We'll keep searching and notify you as soon as someone responds. You can also
          extend the search time or switch to flexible timing.
        </p>
      </div>

      {/* Stats */}
      <div className="bg-slate-800 md:bg-gray-100 rounded-xl p-4 max-w-sm mx-auto">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-lg font-bold text-emerald-400">{notifiedCount}</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Notified</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white md:text-gray-900">0</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Responded</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-400">{job.searchRadius}mi</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Radius</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 md:bg-blue-50 border border-blue-500/30 md:border-blue-200 rounded-xl p-4 max-w-md mx-auto">
        <Bell className="w-5 h-5 text-blue-400 md:text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-blue-300 md:text-blue-800">
          We'll send you a notification as soon as a tradesperson responds to your job.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 max-w-sm mx-auto">
        <Button
          onClick={handleExtendSearch}
          disabled={isExtending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isExtending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Clock className="w-4 h-4 mr-2" />
          )}
          Extend Search Time
        </Button>

        <Button
          onClick={handleConvertToFlexible}
          variant="outline"
          className="w-full border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700"
        >
          Change to Flexible Timing
        </Button>

        <Button
          onClick={handleGoToDashboard}
          variant="ghost"
          className="w-full text-slate-400 hover:text-white md:text-gray-500 md:hover:text-gray-900"
        >
          Go to Dashboard
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )

  // Render background state
  const renderBackground = () => (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-slate-700 md:bg-gray-100 flex items-center justify-center">
        <Users className="w-10 h-10 text-emerald-400 md:text-emerald-600" />
      </div>

      {/* Message */}
      <div>
        <h2 className="text-2xl font-bold text-white md:text-gray-900 mb-2">
          Your job is live
        </h2>
        <p className="text-slate-400 md:text-gray-600 max-w-md mx-auto">
          Your job is visible to tradespeople in your area. You'll receive notifications
          when someone applies.
        </p>
      </div>

      {/* Stats */}
      <div className="bg-slate-800 md:bg-gray-100 rounded-xl p-4 max-w-sm mx-auto">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-lg font-bold text-emerald-400">{notifiedCount}</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Notified</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white md:text-gray-900">{applicationCount}</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Applications</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-400">{job.searchRadius}mi</div>
            <div className="text-xs text-slate-400 md:text-gray-500">Radius</div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="text-left bg-slate-800 md:bg-gray-50 border border-slate-700 md:border-gray-200 rounded-xl p-4 max-w-md mx-auto space-y-2">
        <p className="text-sm font-medium text-white md:text-gray-900">What happens next:</p>
        <ul className="text-sm text-slate-400 md:text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            You'll get a notification when someone applies
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            Review applicants in your dashboard
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            Choose the best tradesperson for your job
          </li>
        </ul>
      </div>

      {/* Action */}
      <Button
        onClick={handleGoToDashboard}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
      >
        <Home className="w-4 h-4 mr-2" />
        Go to Dashboard
      </Button>
    </div>
  )

  // Main render
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-800 md:bg-white border-slate-700 md:border-gray-200 p-6 md:p-8 relative">
        {/* Close button */}
        <button
          onClick={handleGoToDashboard}
          className="absolute top-4 right-4 text-slate-400 hover:text-white md:text-gray-400 md:hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Job Title */}
        <div className="text-center mb-6 pb-4 border-b border-slate-700 md:border-gray-200">
          <Badge className="bg-slate-700 md:bg-gray-100 text-slate-300 md:text-gray-700 mb-2">
            {job.title}
          </Badge>
          <p className="text-xs text-slate-500 md:text-gray-500">
            <MapPin className="w-3 h-3 inline mr-1" />
            {job.location}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Dynamic content based on state */}
        {searchState === "searching" && applicants.length === 0 && renderSearching()}
        {(searchState === "found" || applicants.length > 0) && renderFound()}
        {searchState === "timeout" && applicants.length === 0 && renderTimeout()}
        {searchState === "background" && applicants.length === 0 && renderBackground()}
      </Card>
    </div>
  )
}
