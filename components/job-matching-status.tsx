"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { Clock, Users, MapPin, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

interface JobMatchingStatusProps {
  jobId: string
  onStatusChange?: (status: string) => void
  compact?: boolean
}

interface JobStatus {
  job_id: string
  matching_status: "searching" | "reviewing" | "closed" | "expired"
  applications_count: number
  max_applications: number
  applications_remaining: number
  is_full: boolean
  deadline_at: string | null
  time_remaining_seconds: number | null
  is_expired: boolean
  urgency_type: "asap" | "today" | "flexible" | null
  current_radius: number
  max_radius: number
  homeowner_notified: boolean
}

export default function JobMatchingStatus({ jobId, onStatusChange, compact = false }: JobMatchingStatusProps) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  const supabase = createClient()

  // Fetch job matching status
  const fetchStatus = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc("get_job_matching_status", { job_id_param: jobId })

      if (fetchError) {
        console.error("[JobMatchingStatus] Error fetching status:", fetchError)
        setError("Failed to load status")
        return
      }

      if (data?.error) {
        setError(data.error)
        return
      }

      setStatus(data)
      setTimeRemaining(data.time_remaining_seconds)

      if (onStatusChange && data.matching_status) {
        onStatusChange(data.matching_status)
      }
    } catch (err) {
      console.error("[JobMatchingStatus] Exception:", err)
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)

    return () => clearInterval(interval)
  }, [jobId])

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Format time remaining
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "Expired"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }

    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }

    return `${secs}s`
  }

  // Get status color and icon
  const getStatusInfo = () => {
    if (!status) return { color: "gray", icon: Loader2, label: "Loading" }

    switch (status.matching_status) {
      case "searching":
        return {
          color: "blue",
          icon: Loader2,
          label: "Finding Tradespeople",
          bgClass: "bg-blue-50 border-blue-200",
          textClass: "text-blue-700",
          iconClass: "text-blue-500 animate-spin",
        }
      case "reviewing":
        return {
          color: "orange",
          icon: Users,
          label: "Review Applications",
          bgClass: "bg-orange-50 border-orange-200",
          textClass: "text-orange-700",
          iconClass: "text-orange-500",
        }
      case "closed":
        return {
          color: "green",
          icon: CheckCircle,
          label: "Completed",
          bgClass: "bg-green-50 border-green-200",
          textClass: "text-green-700",
          iconClass: "text-green-500",
        }
      case "expired":
        return {
          color: "red",
          icon: XCircle,
          label: "Expired",
          bgClass: "bg-red-50 border-red-200",
          textClass: "text-red-700",
          iconClass: "text-red-500",
        }
      default:
        return {
          color: "gray",
          icon: AlertCircle,
          label: "Unknown",
          bgClass: "bg-gray-50 border-gray-200",
          textClass: "text-gray-700",
          iconClass: "text-gray-500",
        }
    }
  }

  // Get urgency badge
  const getUrgencyBadge = () => {
    if (!status?.urgency_type) return null

    const badges = {
      asap: { label: "ASAP", className: "bg-red-100 text-red-700" },
      today: { label: "Today", className: "bg-orange-100 text-orange-700" },
      flexible: { label: "Flexible", className: "bg-blue-100 text-blue-700" },
    }

    const badge = badges[status.urgency_type]
    if (!badge) return null

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${compact ? "h-8" : "h-24"}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${compact ? "text-sm" : ""}`}>
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!status) return null

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon
  const progressPercent = (status.applications_count / status.max_applications) * 100

  // Compact view for lists
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgClass}`}>
          <StatusIcon className={`w-3 h-3 ${statusInfo.iconClass}`} />
          <span className={statusInfo.textClass}>{statusInfo.label}</span>
        </div>

        {/* Applications count */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Users className="w-3 h-3" />
          <span>{status.applications_count}/{status.max_applications}</span>
        </div>

        {/* Time remaining */}
        {timeRemaining !== null && timeRemaining > 0 && status.matching_status === "searching" && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span className={timeRemaining < 3600 ? "text-red-600 font-medium" : ""}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {getUrgencyBadge()}
      </div>
    )
  }

  // Full view for detail pages
  return (
    <div className={`p-4 rounded-lg border ${statusInfo.bgClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusInfo.iconClass}`} />
          <span className={`font-semibold ${statusInfo.textClass}`}>{statusInfo.label}</span>
        </div>
        {getUrgencyBadge()}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Applications</span>
          <span className="font-medium">
            {status.applications_count} / {status.max_applications}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              status.is_full ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        {status.is_full && (
          <p className="text-sm text-green-600 mt-1 font-medium">
            ✓ Maximum applications received - ready to review!
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time remaining */}
        {timeRemaining !== null && status.matching_status === "searching" && (
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${timeRemaining < 3600 ? "text-red-500" : "text-gray-500"}`} />
            <div>
              <p className="text-xs text-gray-500">Time Remaining</p>
              <p className={`text-sm font-semibold ${timeRemaining < 3600 ? "text-red-600" : "text-gray-900"}`}>
                {timeRemaining > 0 ? formatTime(timeRemaining) : "Expired"}
              </p>
            </div>
          </div>
        )}

        {/* Search radius */}
        {status.matching_status === "searching" && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Search Radius</p>
              <p className="text-sm font-semibold text-gray-900">
                {status.current_radius} miles
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status-specific messages */}
      {status.matching_status === "searching" && status.applications_count === 0 && (
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            🔍 We're searching for tradespeople in your area. You'll be notified when someone applies.
          </p>
        </div>
      )}

      {status.matching_status === "reviewing" && (
        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
          <p className="text-sm text-orange-800">
            📋 You've received {status.applications_count} applications. Review them and choose your tradesperson!
          </p>
        </div>
      )}

      {status.matching_status === "expired" && (
        <div className="mt-4 p-3 bg-red-100 rounded-lg">
          <p className="text-sm text-red-800">
            ⏰ This job has expired. You can repost it if you still need the work done.
          </p>
        </div>
      )}

      {status.matching_status === "closed" && (
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ You've successfully found a tradesperson for this job!
          </p>
        </div>
      )}
    </div>
  )
}

// Mini version for job cards in lists
export function JobMatchingStatusBadge({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .rpc("get_job_matching_status", { job_id_param: jobId })

      if (data && !data.error) {
        setStatus(data)
      }
    }

    fetchStatus()
  }, [jobId])

  if (!status) return null

  const statusConfig = {
    searching: { bg: "bg-blue-500", text: "Searching" },
    reviewing: { bg: "bg-orange-500", text: "Review" },
    closed: { bg: "bg-green-500", text: "Done" },
    expired: { bg: "bg-red-500", text: "Expired" },
  }

  const config = statusConfig[status.matching_status] || { bg: "bg-gray-500", text: "Unknown" }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.bg}`}>
      {config.text}
      {status.matching_status === "searching" && (
        <span className="ml-1 text-white/80">
          ({status.applications_count}/{status.max_applications})
        </span>
      )}
    </span>
  )
}
