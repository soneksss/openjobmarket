"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, AlertTriangle, CheckCircle, PartyPopper } from "lucide-react"
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
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [step, setStep] = useState<'confirm' | 'review'>('confirm')
  const [reviewerType, setReviewerType] = useState<'homeowner' | 'company' | 'contractor' | 'professional'>('homeowner')

  // Get current user's type when modal opens
  useEffect(() => {
    if (isOpen) {
      getUserType()
    }
  }, [isOpen])

  const getUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (userData?.user_type) {
          setReviewerType(userData.user_type as 'homeowner' | 'company' | 'contractor' | 'professional')
        }
      }
    } catch (error) {
      console.error("Error getting user type:", error)
    }
  }

  const handleMarkComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      // Mark job as completed
      const { error: jobError } = await supabase
        .from("jobs")
        .update({
          completed_at: new Date().toISOString(),
          completion_status: 'completed',
          status: 'completed', // Update job lifecycle status
        })
        .eq("id", jobId)

      if (jobError) throw jobError

      // Move to review step
      setStep('review')
    } catch (err: any) {
      console.error("Error marking job as complete:", err)
      setError(err.message || "Failed to mark job as complete. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setError("Please select a star rating")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Submit review via API using new job-based system
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: jobId,
          reviewedUserId: contractorId,
          reviewedUserType: 'contractor', // Contractor is being reviewed
          reviewerType: reviewerType, // Current user's type (homeowner/company)
          rating,
          comment: reviewText.trim(),
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
        router.refresh()
        onClose()
        // Reset form
        setRating(0)
        setReviewText("")
        setSuccess(false)
        setStep('confirm')
      }, 2000)
    } catch (err) {
      console.error("Error submitting review:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipReview = () => {
    router.refresh()
    onClose()
    setRating(0)
    setReviewText("")
    setStep('confirm')
  }

  const handleClose = () => {
    if (!loading) {
      setRating(0)
      setHoverRating(0)
      setReviewText("")
      setError(null)
      setSuccess(false)
      setStep('confirm')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-green-600" />
                Mark Job as Completed?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to mark "<strong>{jobTitle}</strong>" as completed?
                <br />
                <br />
                This will:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Close the job posting</li>
                  <li>Finalize the work with {contractorName}</li>
                  <li>Allow you to leave a review</li>
                </ul>
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleMarkComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? "Processing..." : "Yes, Mark as Completed"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Leave a Review for {contractorName}</DialogTitle>
              <DialogDescription>
                Help others by sharing your experience working with this tradesperson
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={handleSkipReview} disabled={loading || success} className="w-full sm:w-auto">
                Skip for Now
              </Button>
              <Button onClick={handleSubmitReview} disabled={loading || success || rating === 0} className="w-full sm:w-auto">
                {loading ? "Submitting..." : "Submit Review"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
