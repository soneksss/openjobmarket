"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Calendar, ArrowLeft, MessageCircle, Briefcase, Star, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import { ReviewsList } from "./reviews-list"
import { RatingDisplay } from "./rating-display"
import Link from "next/link"

interface HomeownerProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
  bio?: string
  profile_photo_url?: string
  average_rating?: number
  reviews_count?: number
  created_at: string
  updated_at: string
}

interface HomeownerDetailViewProps {
  homeowner: HomeownerProfile
  user: { id: string; email: string } | null
  userType: string | null
  allowMessaging?: boolean
  isModal?: boolean
}

export default function HomeownerDetailView({
  homeowner,
  user,
  userType,
  allowMessaging = true,
  isModal = false,
}: HomeownerDetailViewProps) {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [showMessageModal, setShowMessageModal] = useState(false)
  const [postedJobs, setPostedJobs] = useState<any[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [liveRating, setLiveRating] = useState(homeowner.average_rating ?? 0)
  const [liveReviewsCount, setLiveReviewsCount] = useState(homeowner.reviews_count ?? 0)

  const isOwnProfile = user?.id === homeowner.user_id
  const isTradesperson = userType === "company" || userType === "contractor"

  useEffect(() => {
    if (!homeowner.id) { setLoadingJobs(false); return }
    let cancelled = false

    async function load() {
      try {
        // Fetch active trade jobs posted by this homeowner.
        // Use is_active + is_tradespeople_job; avoid status filter since values
        // differ across migrations ('open' enum vs 'POSTED' text).
        const { data, error } = await supabase
          .from("jobs")
          .select("id, title, location, budget_min, budget_max, status, urgency_type, created_at")
          .eq("homeowner_id", homeowner.id)
          .eq("is_tradespeople_job", true)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5)

        if (cancelled) return
        if (error) {
          console.error("[HOMEOWNER-DETAIL] posted jobs error:", error.message, error.code, error.details)
          setJobsError(error.message)
        } else {
          setPostedJobs(data ?? [])
        }
      } catch (err: any) {
        if (cancelled) return
        console.error("[HOMEOWNER-DETAIL] unexpected error:", err?.message ?? err)
        setJobsError("Could not load jobs")
      } finally {
        if (!cancelled) setLoadingJobs(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [homeowner.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch live rating from reviews (profile's average_rating field can be stale)
  useEffect(() => {
    if (!homeowner.user_id) return
    let cancelled = false
    supabase
      .from("reviews_with_details")
      .select("rating")
      .eq("reviewed_id", homeowner.user_id)
      .in("reviewed_type", ["homeowner"])
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return
        const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length
        setLiveRating(Math.round(avg * 10) / 10)
        setLiveReviewsCount(data.length)
      })
    return () => { cancelled = true }
  }, [homeowner.user_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fullName = `${homeowner.first_name ?? ""} ${homeowner.last_name ?? ""}`.trim() || "Homeowner"
  const initials = `${homeowner.first_name?.charAt(0) ?? ""}${homeowner.last_name?.charAt(0) ?? ""}` || "H"

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })

  const urgencyBadge = (u: string | null) => {
    if (u === "asap") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">ASAP</Badge>
    if (u === "today") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">Today</Badge>
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Flexible</Badge>
  }

  const card = isModal
    ? "bg-slate-800 border border-slate-700 rounded-xl p-4"
    : "bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
  const text = isModal ? "text-white" : "text-gray-900"
  const muted = isModal ? "text-slate-400" : "text-gray-500"
  const divider = isModal ? "border-slate-700" : "border-gray-200"

  return (
    <div className={`space-y-4 ${isModal ? "p-4" : "container mx-auto px-4 py-8 max-w-4xl"}`}>
      {!isModal && (
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      )}

      {/* Profile card */}
      <div className={card}>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={homeowner.profile_photo_url} alt={fullName} />
            <AvatarFallback className={`text-lg font-bold ${isModal ? "bg-slate-600 text-emerald-400" : "bg-blue-100 text-blue-600"}`}>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className={`text-xl font-bold ${text}`}>{fullName}</h2>
                {homeowner.location && (
                  <p className={`flex items-center gap-1 text-sm mt-0.5 ${muted}`}>
                    <MapPin className="h-3.5 w-3.5" /> {homeowner.location}
                  </p>
                )}
                <div className="mt-1">
                  <RatingDisplay
                    rating={liveRating}
                    reviewsCount={liveReviewsCount}
                    size="sm"
                    className={isModal ? "[&_span]:!text-slate-300" : ""}
                  />
                </div>
              </div>

              {!isOwnProfile && user && allowMessaging && isTradesperson && (
                <Button
                  size="sm"
                  onClick={() => setShowMessageModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Message
                </Button>
              )}
            </div>

            {homeowner.bio && (
              <p className={`text-sm mt-2 ${muted}`}>{homeowner.bio}</p>
            )}

            <p className={`flex items-center gap-1 text-xs mt-2 ${muted}`}>
              <Calendar className="h-3 w-3" />
              Member since {formatDate(homeowner.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Posted jobs */}
        <div className="lg:col-span-3">
          <div className={card}>
            <h3 className={`font-semibold flex items-center gap-2 mb-3 ${text}`}>
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Active Jobs
            </h3>

            {loadingJobs ? (
              <div className={`flex items-center gap-2 py-4 text-sm ${muted}`}>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : jobsError ? (
              <p className="text-sm text-red-400">{jobsError}</p>
            ) : postedJobs.length === 0 ? (
              <p className={`text-sm ${muted}`}>No active jobs at the moment.</p>
            ) : (
              <div className="space-y-2">
                {postedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={`block p-3 rounded-lg border transition-colors ${
                      isModal
                        ? "border-slate-700 hover:border-emerald-500/50 hover:bg-slate-700/50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${text}`}>{job.title}</p>
                        {job.location && (
                          <p className={`flex items-center gap-1 text-xs mt-0.5 ${muted}`}>
                            <MapPin className="h-3 w-3" /> {job.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {urgencyBadge(job.urgency_type)}
                        {job.budget_min && job.budget_max && (
                          <span className={`text-xs font-semibold ${isModal ? "text-emerald-400" : "text-green-600"}`}>
                            £{job.budget_min}–£{job.budget_max}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="lg:col-span-2">
          <div className={card}>
            <h3 className={`font-semibold flex items-center gap-2 mb-3 ${text}`}>
              <Star className="h-4 w-4 text-emerald-500" />
              Reviews
            </h3>
            <ReviewsList
              userId={homeowner.user_id}
              userType="homeowner"
              title=""
              limit={5}
              showViewAll={false}
            />
          </div>
        </div>
      </div>

      {showMessageModal && (
        <MessageModal
          recipientId={homeowner.user_id}
          recipientName={fullName}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  )
}
