"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"

interface ReviewSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  jobId?: string
  jobTitle?: string
  reviewedUserId?: string
  reviewedUserName?: string
  reviewedUserType?: 'homeowner' | 'company' | 'contractor' | 'professional'
  reviewerType?: 'homeowner' | 'company' | 'contractor' | 'professional'
  /** Generic aliases used by conversation-view */
  revieweeId?: string
  revieweeName?: string
  conversationId?: string
  onSuccess?: () => void
}

export default function ReviewSubmissionModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  reviewedUserId,
  reviewedUserName,
  reviewedUserType,
  reviewerType,
  onSuccess,
}: ReviewSubmissionModalProps) {
  const router = useRouter()
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [checkingExisting, setCheckingExisting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const isEditMode = existingReviewId !== null

  // On open: check if user already has a review for this job + reviewed user
  useEffect(() => {
    if (!isOpen) return

    const checkExisting = async () => {
      setCheckingExisting(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from("reviews")
          .select("id, rating, comment")
          .eq("job_id", jobId)
          .eq("reviewer_id", user.id)
          .eq("reviewed_id", reviewedUserId)
          .maybeSingle()

        if (data) {
          setExistingReviewId(data.id)
          setRating(data.rating ?? 0)
          setReviewText(data.comment ?? "")
        }
      } catch {
        // ignore — fall through to normal submit mode
      } finally {
        setCheckingExisting(false)
      }
    }

    checkExisting()
  }, [isOpen, jobId, reviewedUserId])

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response: Response

      if (isEditMode) {
        // Update existing review via PUT /api/reviews/[id]
        response = await fetch(`/api/reviews/${existingReviewId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, reviewText: reviewText.trim() }),
        })
      } else {
        // Create new review via POST /api/reviews
        response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            reviewedUserId,
            reviewedUserType,
            reviewerType,
            rating,
            comment: reviewText.trim(),
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(" "))
        } else {
          setError(data.error || (isEditMode ? "Failed to update review" : "Failed to submit review"))
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        router.refresh()
        onClose()
        setRating(0)
        setReviewText("")
        setSuccess(false)
        setExistingReviewId(null)
      }, 1500)
    } catch (err) {
      console.error("Error submitting review:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setRating(0)
      setHoverRating(0)
      setReviewText("")
      setError(null)
      setSuccess(false)
      setExistingReviewId(null)
      onClose()
    }
  }

  const ratingLabel = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating] ?? ""

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[460px] max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base sm:text-lg">
            {isEditMode ? "Edit Your Review" : "Leave a Review"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditMode
              ? <>Updating your review for <strong>{reviewedUserName}</strong></>
              : <>Rate your experience with <strong>{reviewedUserName}</strong> on: {jobTitle}</>
            }
          </DialogDescription>
        </DialogHeader>

        {checkingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rating *</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 active:scale-95 focus:outline-none touch-manipulation"
                    disabled={loading || success}
                  >
                    <Star
                      className={`w-8 h-8 sm:w-9 sm:h-9 ${
                        (hoverRating || rating) >= star
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      } transition-colors`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-sm text-muted-foreground ml-1">{ratingLabel}</span>
                )}
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-1.5">
              <label htmlFor="reviewText" className="text-sm font-medium">
                Review <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Textarea
                id="reviewText"
                placeholder="Tell others about your experience... (min 10 characters)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={loading || success}
                rows={3}
                maxLength={1000}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {reviewText.length > 0 && reviewText.length < 10 && "Minimum 10 characters"}
                  {reviewText.length >= 10 && "✓ Looks good"}
                </span>
                <span>{reviewText.length}/1000</span>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 py-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 py-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  {isEditMode ? "Review updated!" : "Review submitted!"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button variant="outline" onClick={handleClose} disabled={loading || success} size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || success || rating === 0 || checkingExisting}
            size="sm"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{isEditMode ? "Updating..." : "Submitting..."}</>
              : isEditMode ? "Update Review" : "Submit Review"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
