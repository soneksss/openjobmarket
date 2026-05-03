"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  MapPin,
  Briefcase,
  BookmarkIcon,
  Clock,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
  User,
  Plus,
  Search,
  Eye,
  Calendar,
  Settings,
  Star,
  LocateFixed,
} from "lucide-react"
import { createClient } from "@/lib/client"
import { manualLogout } from "@/hooks/use-auto-logout"
import { StarRating } from "@/components/star-rating"
import { useLocationPermission } from "@/hooks/use-location-permission"
import { LocationPermissionModal } from "@/components/location-permission-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeownerJob {
  id: string
  title: string
  location: string
  is_active: boolean
  status?: string
  completion_status?: string
  created_at: string
  expires_at?: string
  applications_count?: number
  views_count?: number
}

const CLOSED_STATUSES = new Set(["closed", "filled", "expired", "cancelled", "completed"])
function isClosed(job: HomeownerJob) {
  if (!job.is_active) return true
  const s = (job.status ?? "").toLowerCase()
  if (CLOSED_STATUSES.has(s)) return true
  if (job.completion_status === "completed") return true
  if (job.expires_at && new Date(job.expires_at) < new Date()) return true
  return false
}

function JobStatusBadge({ job }: { job: HomeownerJob }) {
  const s = (job.status ?? "").toLowerCase()
  if (!job.is_active || s === "closed" || s === "cancelled")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">Closed</span>
  if (s === "completed")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">Completed</span>
  if (s === "filled")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Filled</span>
  if (s === "expired" || (job.expires_at && new Date(job.expires_at) < new Date()))
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Expired</span>
  if (s === "confirmed")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Confirmed</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>
}

interface SavedTradesperson {
  id: string
  professional_id?: string | null
  company_id?: string | null
  professional_profiles?: {
    id: string
    user_id: string
    first_name?: string
    last_name?: string
    nickname?: string
    title?: string
    location?: string
    profile_photo_url?: string
  } | null
  company_profiles?: {
    id: string
    user_id: string
    company_name?: string
    logo_url?: string
    industry?: string
    location?: string
  } | null
}

interface HomeownerProfile {
  id: string
  first_name: string
  last_name: string
  nickname?: string
  location?: string
  profile_photo_url?: string
  average_rating?: number
  reviews_count?: number
}

interface HomeownerReview {
  id: string
  rating: number
  text: string
  created_at: string
  reviewer_name: string
  reviewer_avatar: string | null
}

interface HomeownerDashboardProps {
  user?: any
  profile: HomeownerProfile
  jobs: HomeownerJob[]
  savedTradespeople?: SavedTradesperson[]
  isProfileComplete?: boolean
  missingFields?: string[]
  reviews?: HomeownerReview[]
}

// ─── Main component ────────────────────────────────────────────────────────────

export function HomeownerDashboard({
  profile,
  jobs,
  savedTradespeople = [],
  user,
  isProfileComplete = true,
  missingFields = [],
  reviews = [],
}: HomeownerDashboardProps) {
  const supabase = createClient()
  const { permState, showModal, requestLocation, confirmModal, dismissModal } = useLocationPermission()

  const [loggingOut, setLoggingOut] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationDetected, setLocationDetected] = useState(false)

  const avgRating = profile.average_rating ?? 0
  const reviewsCount = profile.reviews_count ?? 0

  const displayName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Homeowner"
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "HO"
  const activeJobs = jobs.filter((j) => !isClosed(j))
  const closedJobs = jobs.filter((j) => isClosed(j))
  const activeJobsCount = activeJobs.length
  const closedJobsCount = closedJobs.length

  // ── Unread messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const fetch = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false)
      setUnreadMessages(count || 0)
    }
    fetch()
    const channel = supabase
      .channel("homeowner-dash-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const handleLogout = () => manualLogout()

  const detectLocation = () => {
    setDetectingLocation(true)
    requestLocation(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "OpenJobMarket/1.0" } }
          )
          const geoData = await geoRes.json()
          const postcode = geoData.address?.postcode ?? null
          const town = geoData.address?.town ?? geoData.address?.city ?? geoData.address?.county ?? ""
          const location = postcode ? `${town ? town + ", " : ""}${postcode}` : geoData.display_name?.split(",")[0] ?? ""

          await supabase.from("homeowner_profiles").update({
            location: location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          }).eq("user_id", user?.id)

          setLocationDetected(true)
          window.location.reload()
        } catch (err) {
          console.error("[LOCATION] Failed to detect location:", err)
        } finally {
          setDetectingLocation(false)
        }
      },
      () => { setDetectingLocation(false) },
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <LocationPermissionModal
        open={showModal}
        reason="to set your location automatically"
        permState={permState}
        onAllow={confirmModal}
        onDeny={dismissModal}
      />

      {/* ── Profile incomplete banner (both layouts) ── */}
      {!isProfileComplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Complete your profile</p>
            <p className="text-xs text-amber-400/70">Missing: {missingFields.join(", ")}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {missingFields.includes("location") && (
              <button
                onClick={detectLocation}
                disabled={detectingLocation || locationDetected}
                className="flex items-center gap-1 text-xs font-semibold text-blue-300 hover:text-blue-200 disabled:opacity-50"
              >
                <LocateFixed className={`h-3.5 w-3.5 ${detectingLocation ? "animate-pulse" : ""}`} />
                {detectingLocation ? "Detecting…" : "Use my location"}
              </button>
            )}
            <Link href="/dashboard/homeowner/profile" className="text-xs font-semibold text-amber-300 hover:text-amber-200">
              Fix →
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MOBILE — SpareRoom-style account page (hidden on md+)
      ══════════════════════════════════════════════════════════ */}
      <div className="md:hidden pb-24">
        {/* Profile header */}
        <div className="bg-slate-800 px-4 py-5">
          <Link href="/dashboard/homeowner/profile" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            <Avatar className="h-16 w-16 border-2 border-slate-600 flex-shrink-0">
              <AvatarImage src={profile.profile_photo_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold truncate">{displayName}</p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              {profile.location && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </p>
              )}
              <button
                onClick={(e) => { e.preventDefault(); setShowReviewsModal(true) }}
                className="mt-1.5 hover:opacity-80 transition-opacity text-left"
              >
                {reviewsCount > 0
                  ? <StarRating rating={avgRating} totalReviews={reviewsCount} size="sm" showCount />
                  : <span className="text-xs text-slate-500">No reviews yet</span>
                }
              </button>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0" />
          </Link>
        </div>

        {/* Menu sections */}
        <div className="divide-y divide-slate-800/80">
          <div className="py-1">
            {[
              { icon: Briefcase,    label: "My Jobs",            href: "/dashboard/homeowner/jobs",           count: activeJobsCount, highlight: false },
              { icon: MessageCircle,label: "Messages",            href: "/messages",                           count: unreadMessages,   highlight: unreadMessages > 0 },
              { icon: BookmarkIcon, label: "Saved Tradespeople",  href: "/dashboard/homeowner/saved",          count: savedTradespeople.length, highlight: false },
              { icon: Clock,        label: "Job History",         href: "/dashboard/homeowner/jobs?status=closed", count: closedJobsCount, highlight: false },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count > 0 && (
                    <span className={`text-sm font-semibold ${item.highlight ? "text-emerald-400" : "text-slate-400"}`}>{item.count}</span>
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>

          <div className="py-1">
            {[
              { icon: User,       label: "Edit Profile",      href: "/dashboard/homeowner/profile" },
              { icon: Settings,   label: "Account Settings",  href: "/account/settings" },
              { icon: Bell,       label: "Notifications",     href: "/notifications" },
              { icon: HelpCircle, label: "Help & Support",    href: "/help" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Link>
            ))}
          </div>

          <div className="py-1">
            {[
              { icon: Shield, label: "Privacy Policy", href: "/privacy", danger: false },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${item.danger ? "text-red-500/70" : "text-slate-400"}`} />
                  <span className={`font-medium ${item.danger ? "text-red-400" : "text-white"}`}>{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Link>
            ))}
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors text-red-400 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">{loggingOut ? "Signing out…" : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — 4-column grid layout (hidden below md)
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block pb-10">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6">

            {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
            <div className="col-span-1 space-y-4">

              {/* Profile card */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-5">
                  {/* Avatar */}
                  <Link href="/dashboard/homeowner/profile" className="flex flex-col items-center gap-3 hover:opacity-90 transition-opacity">
                    <Avatar className="h-20 w-20 border-2 border-slate-600">
                      <AvatarImage src={profile.profile_photo_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold text-2xl">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="text-center min-w-0 w-full">
                      <p className="font-bold text-white text-lg truncate">{displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      {profile.location && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {profile.location}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Rating */}
                  <button
                    onClick={() => setShowReviewsModal(true)}
                    className="mt-3 hover:opacity-80 transition-opacity w-full flex justify-center"
                    title="View your reviews"
                  >
                    {reviewsCount > 0
                      ? <StarRating rating={avgRating} totalReviews={reviewsCount} size="sm" showCount />
                      : <span className="text-xs text-slate-500">No reviews yet</span>
                    }
                  </button>

                  {/* Edit profile button */}
                  <Link
                    href="/dashboard/homeowner/profile"
                    className="w-full mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Edit Profile
                  </Link>
                </CardContent>
              </Card>

              {/* Quick stats */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  {[
                    { icon: Briefcase,    label: "Active Jobs",         value: activeJobsCount,          href: "/dashboard/homeowner/jobs" },
                    { icon: Clock,        label: "Closed Jobs",          value: closedJobsCount,          href: "/dashboard/homeowner/jobs?status=closed" },
                    { icon: BookmarkIcon, label: "Saved Tradespeople",   value: savedTradespeople.length, href: "/dashboard/homeowner/saved" },
                    { icon: MessageCircle,label: "Unread Messages",       value: unreadMessages,           href: "/messages", highlight: unreadMessages > 0 },
                  ].map((item, i, arr) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors ${i < arr.length - 1 ? "border-b border-slate-700/60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-300">{item.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${"highlight" in item && item.highlight ? "text-emerald-400" : "text-white"}`}>
                        {item.value}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              {/* Account links */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  {[
                    { icon: Bell,       label: "Notifications",   href: "/notifications" },
                    { icon: Settings,   label: "Account Settings",href: "/account/settings" },
                    { icon: HelpCircle, label: "Help & Support",  href: "/help" },
                    { icon: Shield,     label: "Privacy Policy",  href: "/privacy" },
                  ].map((item, i, arr) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white ${i < arr.length - 1 ? "border-b border-slate-700/60" : ""}`}
                    >
                      <item.icon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  ))}
                  <div className="border-t border-slate-700/60">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── MAIN CONTENT ──────────────────────────────────── */}
            <div className="col-span-3 space-y-5">

              {/* Quick actions — premium dark style */}
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/homeowner/post-job"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/40 transition-all hover:shadow-emerald-900/60"
                >
                  <Plus className="h-4 w-4" />
                  Post a Job
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-200 text-sm font-medium transition-all"
                >
                  <Search className="h-4 w-4 text-slate-400" />
                  Find Tradespeople
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-200 text-sm font-medium transition-all"
                >
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                  Messages
                  {unreadMessages > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </div>

              {/* Active jobs */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-400" />
                    Active Jobs
                    {activeJobsCount > 0 && (
                      <span className="text-xs font-normal text-slate-400 ml-1">({activeJobsCount})</span>
                    )}
                  </CardTitle>
                  <Link href="/dashboard/homeowner/jobs" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                    View all →
                  </Link>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {activeJobs.length === 0 ? (
                    <div className="text-center py-10">
                      <Briefcase className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 mb-4">No active jobs yet</p>
                      <Link
                        href="/dashboard/homeowner/post-job"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Post your first job
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeJobs.slice(0, 6).map((job) => (
                        <Link
                          key={job.id}
                          href={`/dashboard/homeowner/jobs/${job.id}`}
                          className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-700/40 hover:bg-slate-700/70 transition-colors border border-slate-700/60 hover:border-slate-600 group"
                        >
                          {/* Left: title + meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white text-sm truncate">{job.title}</p>
                              <JobStatusBadge job={job} />
                            </div>
                            <div className="flex items-center gap-3">
                              {job.location && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {job.location}
                                </span>
                              )}
                              <span className="text-xs text-slate-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>

                          {/* Right: responses + views */}
                          <div className="flex items-center gap-5 flex-shrink-0">
                            <div className="text-right">
                              <p className={`text-lg font-bold leading-none ${(job.applications_count ?? 0) > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                                {job.applications_count ?? 0}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">responses</p>
                            </div>
                            {(job.views_count ?? 0) > 0 && (
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-400 leading-none">{job.views_count}</p>
                                <p className="text-[10px] text-slate-600 mt-0.5 flex items-center justify-end gap-0.5">
                                  <Eye className="h-2.5 w-2.5" />views
                                </p>
                              </div>
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                          </div>
                        </Link>
                      ))}
                      {activeJobs.length > 6 && (
                        <Link href="/dashboard/homeowner/jobs" className="block text-center text-xs text-slate-500 hover:text-emerald-400 pt-2 transition-colors">
                          + {activeJobs.length - 6} more active jobs →
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job history */}
              {closedJobs.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      Job History
                      <span className="text-xs font-normal text-slate-400 ml-1">({closedJobsCount})</span>
                    </CardTitle>
                    <Link href="/dashboard/homeowner/jobs?status=closed" className="text-xs text-slate-400 hover:text-white transition-colors">
                      View all →
                    </Link>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="space-y-2">
                      {closedJobs.slice(0, 4).map((job) => (
                        <Link
                          key={job.id}
                          href={`/dashboard/homeowner/jobs/${job.id}`}
                          className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-700/20 hover:bg-slate-700/40 transition-colors border border-slate-700/40 hover:border-slate-600/60 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-slate-300 text-sm truncate">{job.title}</p>
                              <JobStatusBadge job={job} />
                            </div>
                            <div className="flex items-center gap-3">
                              {job.location && (
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{job.location}
                                </span>
                              )}
                              <span className="text-xs text-slate-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-500 leading-none">{job.applications_count ?? 0}</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">responses</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </Link>
                      ))}
                      {closedJobs.length > 4 && (
                        <Link href="/dashboard/homeowner/jobs?status=closed" className="block text-center text-xs text-slate-500 hover:text-white pt-2 transition-colors">
                          + {closedJobs.length - 4} more in history →
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Saved tradespeople preview */}
              {savedTradespeople.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      <BookmarkIcon className="h-4 w-4 text-blue-400" />
                      Saved Tradespeople
                    </CardTitle>
                    <Link href="/dashboard/homeowner/saved" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      View all →
                    </Link>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="flex flex-wrap gap-3">
                      {savedTradespeople.slice(0, 6).map((saved) => {
                        const isCompany = !!saved.company_profiles
                        const cp = saved.company_profiles
                        const pp = saved.professional_profiles
                        const name = isCompany
                          ? (cp?.company_name || "Tradesperson")
                          : (pp?.first_name && pp?.last_name ? `${pp.first_name} ${pp.last_name}` : pp?.nickname || "Tradesperson")
                        const avatar = isCompany ? cp?.logo_url : pp?.profile_photo_url
                        const subtitle = isCompany ? cp?.industry : pp?.title
                        const initials2 = name.substring(0, 2).toUpperCase()
                        const href = isCompany ? `/companies/${cp?.id}` : `/professionals/${pp?.user_id}`
                        return (
                          <Link
                            key={saved.id}
                            href={href}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/40 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-600 transition-colors"
                          >
                            <Avatar className="h-8 w-8 border border-slate-600 flex-shrink-0">
                              <AvatarImage src={avatar || undefined} className="object-cover" />
                              <AvatarFallback className="bg-slate-600 text-white text-xs font-bold">{initials2}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{name}</p>
                              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Reviews modal */}
      <Dialog open={showReviewsModal} onOpenChange={setShowReviewsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-slate-900 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Your Reviews</DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400">{avgRating > 0 ? avgRating.toFixed(1) : "0.0"}</div>
              <div className="text-xs text-slate-500 mt-0.5">out of 5</div>
            </div>
            <div className="flex-1">
              <StarRating rating={avgRating} totalReviews={reviewsCount} size="md" showCount={false} />
              <p className="text-xs text-slate-500 mt-1">Based on {reviewsCount} review{reviewsCount !== 1 ? "s" : ""} from tradespeople</p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No reviews yet. Reviews appear here after tradespeople rate you.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {review.reviewer_avatar ? (
                          <AvatarImage src={review.reviewer_avatar} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                          {review.reviewer_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-white">{review.reviewer_name}</p>
                        <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`} />
                      ))}
                    </div>
                  </div>
                  {review.text && (
                    <p className="text-sm text-slate-300 leading-relaxed">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
