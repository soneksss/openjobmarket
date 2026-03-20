"use client"

import { useState, useEffect } from "react"
import { Star, AlertTriangle, CheckCircle, PartyPopper, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"

interface JobCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  jobTitle: string
  contractorId: string
  contractorName: string
  contractorProfileId: string
}

export function JobCompletionModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  contractorId,
  contractorName,
  contractorProfileId,
}: JobCompletionModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<"confirm" | "review">("confirm")
  const [reviewerType, setReviewerType] = useState<"homeowner" | "company" | "contractor" | "professional">("homeowner")

  useEffect(() => {
    if (isOpen) getUserType()
  }, [isOpen])

  const getUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("users").select("user_type").eq("id", user.id).single()
        if (data?.user_type) setReviewerType(data.user_type as typeof reviewerType)
      }
    } catch {}
  }

  const handleMarkComplete = async () => {
    setLoading(true)
    setError(null)
    try {
      // Use the SECURITY DEFINER RPC — direct status updates are blocked by trigger
      const { error: rpcError } = await supabase.rpc("complete_job", { p_job_id: jobId })
      if (rpcError) throw rpcError
      setStep("review")
    } catch (err: any) {
      setError(err.message || "Failed to mark job as complete. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (rating === 0) { setError("Please select a star rating"); return }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          reviewedUserId: contractorId,
          reviewedUserType: "company",
          reviewerType,
          rating,
          comment: reviewText.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(Array.isArray(data.details) ? data.details.join(" ") : data.error || "Failed to submit review")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        handleClose()
      }, 2000)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setRating(0)
    setHoverRating(0)
    setReviewText("")
    setError(null)
    setSuccess(false)
    setStep("confirm")
    onClose()
  }

  if (!isOpen) return null

  const ratingLabel = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating] ?? ""

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Accent bar */}
        <div className={`h-1 w-full ${step === "review" && success ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`} />

        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "confirm" ? (
          <>
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <PartyPopper className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mb-1">Mark Job as Completed?</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                You&apos;re about to mark <span className="text-white font-medium">&ldquo;{jobTitle}&rdquo;</span> as completed
                with <span className="text-white font-medium">{contractorName}</span>.
              </p>
              <div className="mt-4 space-y-2 text-left">
                {["Closes the job posting", `Finalises the work with ${contractorName}`, "Lets you leave a review"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-6 mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Completing…</>
                ) : "Yes, Mark as Completed"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pt-6 pb-2">
              <p className="text-lg font-bold text-white">Rate {contractorName}</p>
              <p className="text-sm text-slate-400 mt-0.5">Help others by sharing your experience</p>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Stars */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Rating *</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      disabled={loading || success}
                      className="transition-transform hover:scale-110 focus:outline-none disabled:opacity-50"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          (hoverRating || rating) >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-slate-700 text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm font-semibold text-yellow-400">{ratingLabel}</span>
                  )}
                </div>
              </div>

              {/* Review text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Review (optional)</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell others about your experience… (min 10 characters)"
                  disabled={loading || success}
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none disabled:opacity-50"
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

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Review submitted successfully!
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => { router.refresh(); handleClose() }}
                disabled={loading || success}
                className="py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-40"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={loading || success || rating === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                ) : success ? "Submitted!" : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
