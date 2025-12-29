"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Flag, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/client"
import { RatingDisplay } from "./rating-display"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string
  reviewer_type: string
  reviewed_type: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
  reviewer_name?: string
  reviewer_photo?: string
  job_title?: string
}

interface ReviewsListProps {
  userId: string
  userType: "homeowner" | "company" | "contractor" | "professional"
  title?: string
  limit?: number
  showViewAll?: boolean
}

export function ReviewsList({
  userId,
  userType,
  title = "Reviews",
  limit,
  showViewAll = false
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showFlagDialog, setShowFlagDialog] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const [flagging, setFlagging] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchReviews()
  }, [userId])

  const fetchReviews = async () => {
    try {
      setLoading(true)

      // Get reviews from the view which includes reviewer details
      let query = supabase
        .from("reviews_with_details")
        .select("*")
        .eq("reviewed_id", userId)
        .eq("reviewed_type", userType)
        .order("created_at", { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error("[REVIEWS-LIST] Error fetching reviews:", error)
        return
      }

      setReviews(data || [])
    } catch (error) {
      console.error("[REVIEWS-LIST] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFlagReview = async () => {
    if (!selectedReview || !flagReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for flagging this review",
        variant: "destructive"
      })
      return
    }

    try {
      setFlagging(true)

      const { error } = await supabase
        .from("reviews")
        .update({
          is_flagged: true,
          flag_reason: flagReason
        })
        .eq("id", selectedReview.id)

      if (error) throw error

      toast({
        title: "Review Flagged",
        description: "This review has been flagged for admin review. Thank you for helping maintain quality.",
      })

      setShowFlagDialog(false)
      setSelectedReview(null)
      setFlagReason("")
      fetchReviews() // Refresh the list
    } catch (error) {
      console.error("[REVIEWS-LIST] Error flagging review:", error)
      toast({
        title: "Error",
        description: "Failed to flag review. Please try again.",
        variant: "destructive"
      })
    } finally {
      setFlagging(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading reviews...</p>
        </CardContent>
      </Card>
    )
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No reviews yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {showViewAll && reviews.length > 0 && (
              <Button variant="link" size="sm">
                View All ({reviews.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b last:border-b-0 pb-4 last:pb-0"
            >
              <div className="flex items-start gap-3">
                {/* Reviewer Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.reviewer_photo} />
                  <AvatarFallback>
                    {review.reviewer_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  {/* Reviewer Name and Rating */}
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">
                        {review.reviewer_name || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <RatingDisplay
                          rating={review.rating}
                          reviewsCount={0}
                          showCount={false}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review)
                        setShowFlagDialog(true)
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Job Title */}
                  {review.job_title && (
                    <p className="text-xs text-gray-600 mb-2">
                      Job: {review.job_title}
                    </p>
                  )}

                  {/* Review Comment */}
                  <p className="text-sm text-gray-700">{review.comment}</p>

                  {/* Flagged Badge */}
                  {review.is_flagged && (
                    <Badge variant="destructive" className="mt-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Flagged for Review
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Flag Review Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              Please provide a reason for flagging this review. Our admin team will review it shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for flagging (e.g., inappropriate content, fake review, spam)"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={4}
            />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Common reasons for flagging:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Inappropriate or offensive language</li>
                <li>Suspected fake or fraudulent review</li>
                <li>Spam or promotional content</li>
                <li>Contains personal information</li>
                <li>Unrelated to the job or service</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFlagDialog(false)
                setFlagReason("")
              }}
              disabled={flagging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagReview}
              disabled={flagging || !flagReason.trim()}
              variant="destructive"
            >
              {flagging ? "Flagging..." : "Flag Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
