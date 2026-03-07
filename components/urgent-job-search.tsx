"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  Clock,
  CheckCircle2,
  Search,
  AlertCircle,
  ChevronRight,
  X,
  Zap,
  Users,
  ArrowRight,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/client"

// Types
type UrgencyType = "asap" | "today"
type SearchState = "active_search" | "response_received" | "auto_downgraded" | "background_search"

interface Tradesperson {
  id: string
  name: string
  business_name?: string
  avatar_url?: string
  rating: number
  review_count: number
  distance_miles: number
  response_time?: string
  verified: boolean
  phone?: string
}

interface UrgentJobSearchProps {
  jobId: string
  jobTitle: string
  urgencyType: UrgencyType
  initialRadius: number
  location: string
  onClose?: () => void
  onConvertToStandard?: () => void
}

// NEW TIMING CONSTANTS - Updated per requirements
const TIMING = {
  asap: {
    initialSearchSeconds: 600, // 10 minutes
    pollIntervalMs: 3000, // 3 seconds - fast polling for ASAP
    autoDowngradeToToday: true, // Auto-convert to Today after timer
  },
  today: {
    initialSearchSeconds: 7200, // 2 hours (1-3 hour window, using middle)
    pollIntervalMs: 10000, // 10 seconds - slower polling for Today
    autoDowngradeToToday: false,
  }
}

export function UrgentJobSearch({
  jobId,
  jobTitle,
  urgencyType: initialUrgencyType,
  initialRadius,
  location,
  onClose,
  onConvertToStandard
}: UrgentJobSearchProps) {
  const [searchState, setSearchState] = useState<SearchState>("active_search")
  const [urgencyType, setUrgencyType] = useState<UrgencyType>(initialUrgencyType)
  const [secondsRemaining, setSecondsRemaining] = useState(TIMING[initialUrgencyType].initialSearchSeconds)
  const [currentRadius, setCurrentRadius] = useState(initialRadius)
  const [respondedTradespeople, setRespondedTradespeople] = useState<Tradesperson[]>([])
  const [notifiedCount, setNotifiedCount] = useState(0)
  const [isDowngrading, setIsDowngrading] = useState(false)

  const timing = TIMING[urgencyType]

  // Auto-downgrade ASAP to Today after timeout
  const handleAutoDowngrade = useCallback(async () => {
    if (urgencyType !== "asap") return

    setIsDowngrading(true)

    try {
      // Update job in database to Today urgency
      const supabase = createClient()
      await supabase
        .from("jobs")
        .update({
          urgency_type: "today",
          search_state: "active_search",
        })
        .eq("id", jobId)

      // Update local state
      setUrgencyType("today")
      setSearchState("auto_downgraded")
      setSecondsRemaining(TIMING.today.initialSearchSeconds)
      setCurrentRadius(prev => Math.min(prev * 1.5, 25)) // Expand radius
    } catch (error) {
      console.error("Error downgrading job:", error)
    } finally {
      setIsDowngrading(false)
    }
  }, [jobId, urgencyType])

  // Poll for responses
  const pollForResponses = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/urgent-responses`)
      if (response.ok) {
        const data = await response.json()
        if (data.responses && data.responses.length > 0) {
          setRespondedTradespeople(data.responses)
          setSearchState("response_received")
        }
        if (data.notifiedCount) {
          setNotifiedCount(data.notifiedCount)
        }
      }
    } catch (error) {
      console.error("Error polling for responses:", error)
    }
  }, [jobId])

  // Countdown timer effect
  useEffect(() => {
    if (searchState !== "active_search" && searchState !== "auto_downgraded") return

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // ASAP timeout - auto-downgrade to Today
          if (urgencyType === "asap" && timing.autoDowngradeToToday) {
            handleAutoDowngrade()
            return 0
          }
          // Today timeout - move to background search
          setSearchState("background_search")
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [searchState, urgencyType, timing.autoDowngradeToToday, handleAutoDowngrade])

  // Polling effect
  useEffect(() => {
    if (searchState === "background_search") return

    const pollInterval = setInterval(pollForResponses, timing.pollIntervalMs)
    pollForResponses() // Initial poll

    return () => clearInterval(pollInterval)
  }, [searchState, pollForResponses, timing.pollIntervalMs])

  // Format time remaining
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  // Handle contact tradesperson
  const handleContact = (tradesperson: Tradesperson, method: "call" | "message") => {
    if (method === "call" && tradesperson.phone) {
      window.location.href = `tel:${tradesperson.phone}`
    } else {
      // Navigate to messages
      window.location.href = `/messages?to=${tradesperson.id}&job=${jobId}`
    }
  }

  // Continue to background search
  const handleContinueInBackground = () => {
    setSearchState("background_search")
  }

  // Render based on current state
  const renderContent = () => {
    switch (searchState) {
      case "active_search":
        return (
          <div className="text-center space-y-6">
            {/* Radar Animation */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-ping animation-delay-200" />
              <div className="absolute inset-4 rounded-full bg-emerald-500/40 animate-ping animation-delay-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Search className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {urgencyType === "asap"
                  ? "Finding available tradespeople NOW..."
                  : "Searching for tradespeople today..."
                }
              </h2>
              <p className="text-slate-400">
                Searching within {currentRadius} miles of {location}
              </p>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{notifiedCount}</div>
                <div className="text-sm text-slate-400">Tradespeople alerted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatTime(secondsRemaining)}</div>
                <div className="text-sm text-slate-400">
                  {urgencyType === "asap" ? "ASAP window" : "Search time"}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${(1 - secondsRemaining / timing.initialSearchSeconds) * 100}%`
                }}
              />
            </div>

            {/* Urgency indicator */}
            <Badge className={cn(
              "text-sm px-3 py-1",
              urgencyType === "asap"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            )}>
              <Zap className="w-3 h-3 mr-1" />
              {urgencyType === "asap" ? "ASAP - Emergency Priority" : "Today - Same Day"}
            </Badge>

            {/* ASAP specific message */}
            {urgencyType === "asap" && (
              <p className="text-xs text-slate-500">
                First available tradesperson can accept immediately.
                If no one responds, we'll expand the search.
              </p>
            )}

            {/* Option to continue in background */}
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white text-sm"
              onClick={handleContinueInBackground}
            >
              Continue in background
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )

      case "response_received":
        return (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {respondedTradespeople.length === 1
                  ? "A tradesperson is available!"
                  : `${respondedTradespeople.length} tradespeople interested!`}
              </h2>
              <p className="text-slate-400">
                {urgencyType === "asap"
                  ? "Contact them now to confirm the job"
                  : "Review their profiles and choose the best fit"
                }
              </p>
            </div>

            {/* Tradesperson Cards */}
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {respondedTradespeople.map((person, index) => (
                <Card key={person.id} className={cn(
                  "p-4 bg-slate-700/50 border-slate-600",
                  urgencyType === "asap" && index === 0 && "ring-2 ring-emerald-500/50"
                )}>
                  {urgencyType === "asap" && index === 0 && (
                    <Badge className="mb-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      First to respond
                    </Badge>
                  )}
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-semibold text-slate-300">
                          {person.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">
                          {person.business_name || person.name}
                        </h3>
                        {person.verified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {person.rating.toFixed(1)} ({person.review_count})
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {person.distance_miles.toFixed(1)} mi
                        </span>
                      </div>

                      {person.response_time && (
                        <p className="text-sm text-emerald-400 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {person.response_time}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleContact(person, "call")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Now
                    </Button>
                    <Button
                      onClick={() => handleContact(person, "message")}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Keep searching option */}
            {urgencyType === "today" && (
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
                onClick={() => setSearchState("active_search")}
              >
                Keep searching for more quotes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )

      case "auto_downgraded":
        return (
          <div className="text-center space-y-6">
            {/* Transition Animation */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/50 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <RefreshCw className={cn(
                    "w-8 h-8 text-amber-400",
                    isDowngrading && "animate-spin"
                  )} />
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Expanding your search
              </h2>
              <p className="text-slate-400 max-w-sm mx-auto">
                We couldn't find someone immediately. We're expanding the search
                and will notify you as soon as a tradesperson is available.
              </p>
            </div>

            {/* New urgency badge */}
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Clock className="w-3 h-3 mr-1" />
              Now searching as "Today" priority
            </Badge>

            {/* Stats */}
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{notifiedCount}</div>
                <div className="text-sm text-slate-400">Tradespeople alerted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatTime(secondsRemaining)}</div>
                <div className="text-sm text-slate-400">Extended search</div>
              </div>
            </div>

            {/* Info message */}
            <div className="bg-amber-500/10 rounded-lg p-4 text-sm text-amber-200/80">
              <AlertCircle className="w-4 h-4 inline mr-2 text-amber-400" />
              Your job is now visible to more tradespeople in a wider area.
              We'll alert you immediately when someone responds.
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleContinueInBackground}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue & Get Notified
              </Button>

              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
              >
                Stay on this screen
              </Button>
            </div>
          </div>
        )

      case "background_search":
        return (
          <div className="text-center space-y-6">
            {/* Background Search Icon */}
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-700 flex items-center justify-center">
              <Users className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Message */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Search continuing in background
              </h2>
              <p className="text-slate-400 max-w-md mx-auto">
                Your job is live and visible to all tradespeople in your area.
                You'll receive notifications when someone applies.
              </p>
            </div>

            {/* Stats summary */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-lg font-bold text-emerald-400">{notifiedCount}</div>
                  <div className="text-xs text-slate-400">Alerted</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{respondedTradespeople.length}</div>
                  <div className="text-xs text-slate-400">Interested</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-400">{currentRadius}mi</div>
                  <div className="text-xs text-slate-400">Radius</div>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="text-left bg-slate-700/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-white">What happens next:</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  You'll get a push notification when someone applies
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

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Go to Dashboard
              </Button>

              <Button
                onClick={onConvertToStandard}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Convert to Flexible timing
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-800 border-slate-700 p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Job Title */}
        <div className="text-center mb-6 pb-4 border-b border-slate-700">
          <Badge className="bg-slate-700 text-slate-300 mb-2">
            {jobTitle}
          </Badge>
        </div>

        {/* Dynamic Content */}
        {renderContent()}
      </Card>
    </div>
  )
}
