"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star, CheckCircle, AlertTriangle, PartyPopper, Pencil } from "lucide-react"
import { createClient } from "@/lib/client"

interface JobInfo {
  id: string
  title: string
  status: string
  confirmed_tradesperson_id: string | null
  company_profiles: {
    id: string
    company_name: string
    logo_url: string | null
    user_id: string
  } | null
}

interface ExistingReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

function ReviewForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("job")
  const supabase = createClient()

  const [job, setJob] = useState<JobInfo | null>(null)
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [rating, setRating]       = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")

  useEffect(() => {
    if (!jobId) { setLoading(false); return }
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }

      // Step 1: fetch job + existing review in parallel
      const [jobRes, reviewRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, status, confirmed_tradesperson_id")
          .eq("id", jobId!)
          .maybeSingle(),

        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("job_id", jobId!)
          .eq("reviewer_id", user.id)
          .maybeSingle(),
      ])

      // Step 2: fetch confirmed tradesperson's company profile separately
      let companyProfile: JobInfo["company_profiles"] = null
      const tradespersonProfileId = jobRes.data?.confirmed_tradesperson_id
      if (tradespersonProfileId) {
        const { data: cp } = await supabase
          .from("company_profiles")
          .select("id, company_name, logo_url, user_id")
          .eq("id", tradespersonProfileId)
          .maybeSingle()
        companyProfile = cp ?? null
      }

      setJob(jobRes.data ? { ...jobRes.data, company_profiles: companyProfile } : null)

      if (reviewRes.data) {
        setExistingReview(reviewRes.data as ExistingReview)
        setRating(reviewRes.data.rating ?? 0)
        setReviewText(reviewRes.data.comment ?? "")
      }
    } catch (err) {
      console.error("[REVIEW-PAGE] loadData error:", err)
      setError("Failed to load job details.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating."); return }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }

      let response: Response

      if (existingReview) {
        // Edit mode — update via PUT
        response = await fetch(`/api/reviews/${existingReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, reviewText: reviewText.trim() }),
        })
      } else {
        // New review — POST
        const tradesperson = job?.company_profiles
        if (!tradesperson?.user_id) {
          setError("Could not find tradesperson to review.")
          setSubmitting(false)
          return
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle()

        response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            reviewedUserId: tradesperson.user_id,
            reviewedUserType: "company",
            reviewerType: userRow?.user_type ?? "homeowner",
            rating,
            comment: reviewText.trim(),
          }),
        })
      }

      const data = await response.json()
      if (!response.ok) {
        setError(Array.isArray(data.details) ? data.details.join(" ") : data.error || "Failed to submit review.")
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/dashboard/homeowner/jobs?status=closed"), 2500)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabel = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating] ?? ""
  const isEditMode  = !!existingReview
  const tradesperson = job?.company_profiles

  // Check if 24h edit window has passed
  const canEdit = !existingReview || (
    (Date.now() - new Date(existingReview.created_at).getTime()) < 24 * 60 * 60 * 1000
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!jobId || !job) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4 opacity-60" />
        <p className="text-slate-300 font-medium mb-1">Job not found</p>
        <p className="text-slate-500 text-sm mb-6">The job you&apos;re trying to review could not be found.</p>
        <Link href="/dashboard/homeowner/jobs" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
          Back to My Jobs
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-emerald-400" />
        </div>
        <p className="text-xl font-bold text-white mb-2">
          {isEditMode ? "Review Updated!" : "Review Submitted!"}
        </p>
        <p className="text-sm text-slate-400">Thank you for your feedback. Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Edit-mode banner */}
      {isEditMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/25 rounded-xl">
          <Pencil className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-300">
            {canEdit
              ? "You've already reviewed this job — you can update it below."
              : "Your review can no longer be edited (24-hour window has passed)."}
          </p>
        </div>
      )}

      {/* Job info */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
          {isEditMode ? "Editing review for" : "Reviewing work on"}
        </p>
        <p className="text-base font-bold text-white">{job.title}</p>
        {tradesperson && (
          <p className="text-sm text-slate-400 mt-0.5">
            Tradesperson: <span className="text-slate-300 font-medium">{tradesperson.company_name}</span>
          </p>
        )}
      </div>

      {/* Rating + text */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Star rating <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => canEdit && setRating(star)}
                onMouseEnter={() => canEdit && setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={submitting || !canEdit}
                className="transition-transform hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    (hoverRating || rating) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-slate-700 text-slate-600"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm font-semibold text-yellow-400">{ratingLabel}</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Review <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Describe your experience — quality of work, punctuality, communication…"
            disabled={submitting || !canEdit}
            rows={4}
            maxLength={1000}
            className="w-full bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {reviewText.length > 0 && reviewText.length < 10 && "Minimum 10 characters"}
              {reviewText.length >= 10 && <span className="text-emerald-400">Looks good!</span>}
            </span>
            <span>{reviewText.length}/1000</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Link
            href="/dashboard/homeowner/jobs?status=closed"
            className="flex-shrink-0 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            {isEditMode ? "Cancel" : "Skip"}
          </Link>
          {canEdit && (
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {isEditMode ? "Updating…" : "Submitting…"}</>
              ) : isEditMode ? (
                <><Pencil className="w-4 h-4" /> Update Review</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Submit Review</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReviewNewPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/homeowner/jobs?status=closed"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-white">Leave a Review</h1>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        }>
          <ReviewForm />
        </Suspense>
      </div>
    </div>
  )
}
