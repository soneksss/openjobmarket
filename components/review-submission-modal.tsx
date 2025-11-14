"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, AlertTriangle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReviewSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  revieweeId: string
  revieweeName: string
  conversationId?: string
  onSuccess?: () => void
}

export default function ReviewSubmissionModal({
  isOpen,
  onClose,
  revieweeId,
  revieweeName,
  conversationId,
  onSuccess,
}: ReviewSubmissionModalProps) {
  const router = useRouter()
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          revieweeId,
          rating,
          reviewText: reviewText.trim() || null,
          conversationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(" "))
        } else {
          setError(data.error || "Failed to submit review")
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        router.refresh()
        onClose()
        // Reset form
        setRating(0)
        setReviewText("")
        setSuccess(false)
      }, 2000)
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
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience working with <strong>{revieweeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating *</label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  disabled={loading || success}
                >
                  <Star
                    className={`w-10 h-10 ${
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-200"
                    } transition-colors`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label htmlFor="reviewText" className="text-sm font-medium">
              Review (Optional)
            </label>
            <Textarea
              id="reviewText"
              placeholder="Tell others about your experience... (minimum 10 characters)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={loading || success}
              rows={5}
              maxLength={1000}
              className="resize-none shadow-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {reviewText.length > 0 && reviewText.length < 10 && "Minimum 10 characters"}
                {reviewText.length >= 10 && "Looking good!"}
              </span>
              <span>{reviewText.length}/1000</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Review submitted successfully!</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading || success}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || success || rating === 0}>
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
