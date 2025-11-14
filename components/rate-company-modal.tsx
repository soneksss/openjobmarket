"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { InteractiveStarRating } from "@/components/star-rating"
import { submitReview, getUserReviewForCompany } from "@/app/reviews/actions"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface RateCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyUserId: string
  companyName: string
  conversationId?: string
}

export function RateCompanyModal({
  open,
  onOpenChange,
  companyUserId,
  companyName,
  conversationId,
}: RateCompanyModalProps) {
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const router = useRouter()

  // Fetch existing review when modal opens
  useEffect(() => {
    if (open && companyUserId) {
      fetchExistingReview()
    }
  }, [open, companyUserId])

  const fetchExistingReview = async () => {
    setLoading(true)
    try {
      const existingReview = await getUserReviewForCompany(companyUserId)

      if (existingReview) {
        setRating(existingReview.rating)
        setReviewText(existingReview.review_text || "")
        setIsEditing(true)
        setExistingReviewId(existingReview.id)
      } else {
        // Reset for new review
        setRating(0)
        setReviewText("")
        setIsEditing(false)
        setExistingReviewId(null)
      }
    } catch (err) {
      console.error("Error fetching existing review:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitReview({
        revieweeId: companyUserId,
        rating,
        reviewText: reviewText.trim() || null,
        conversationId: conversationId || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        // Success - close modal and reset
        setRating(0)
        setReviewText("")
        setIsEditing(false)
        setExistingReviewId(null)
        onOpenChange(false)
        router.refresh() // Refresh to show updated rating

        // Optional: Show success toast/notification
        console.log(result.isEdit ? "Review updated successfully!" : "Review submitted successfully!")
      }
    } catch (err) {
      setError(isEditing ? "Failed to update review. Please try again." : "Failed to submit review. Please try again.")
      console.error("Error submitting review:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? "Update Your Review" : "Rate"} {companyName}</DialogTitle>
            {isEditing && (
              <Badge variant="secondary" className="text-xs">
                Editing
              </Badge>
            )}
          </div>
          <DialogDescription>
            {isEditing
              ? "Update your rating and review for this company."
              : "Share your experience working with this company. Your feedback helps others make informed decisions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Star Rating */}
              <div className="space-y-2">
                <Label>Your Rating *</Label>
                <div className="flex items-center gap-3">
                  <InteractiveStarRating value={rating} onChange={setRating} size="lg" />
                  {rating > 0 && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {rating} {rating === 1 ? "star" : "stars"}
                    </span>
                  )}
                </div>
              </div>

          {/* Review Text (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="review">Your Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Tell us about your experience with this company..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/1000 characters
            </p>
          </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setRating(0)
              setReviewText("")
              setError(null)
              onOpenChange(false)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading || rating === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Submitting..."}
              </>
            ) : (
              isEditing ? "Update Review" : "Submit Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
