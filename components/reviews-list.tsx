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
  reviewer_first_name?: string
  reviewer_last_name?: string
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

const DEFAULT_VISIBLE = 5

function formatReviewerName(review: Review): string {
  const first = review.reviewer_first_name?.trim()
  const last = review.reviewer_last_name?.trim()
  if (first && last) return `${first} ${last.charAt(0)}.`
  if (first) return first
  return review.reviewer_name || "Anonymous"
}

function getInitials(review: Review): string {
  const first = review.reviewer_first_name?.trim()
  const last = review.reviewer_last_name?.trim()
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  if (first) return first.charAt(0).toUpperCase()
  return "U"
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
  const [showAll, setShowAll] = useState(false)
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
      // Legacy reviews may have been stored as "contractor" — match both for company profiles
      const reviewedTypes =
        userType === "company" ? ["company", "contractor"] : [userType]

      let query = supabase
        .from("reviews_with_details")
        .select("*")
        .eq("reviewed_id", userId)
        .in("reviewed_type", reviewedTypes)
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
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{title}</p>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{title}</p>
        <p className="text-sm text-slate-500 italic">No reviews yet.</p>
      </div>
    )
  }

  const visibleCount = limit ?? (showAll ? reviews.length : DEFAULT_VISIBLE)
  const visibleReviews = reviews.slice(0, visibleCount)
  const hasMore = reviews.length > visibleCount && !limit

  return (
    <>
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
          <span className="text-xs text-slate-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <div key={review.id} className="border-b border-slate-700/50 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={review.reviewer_photo || undefined} />
                  <AvatarFallback className="bg-slate-700 text-slate-300 text-sm font-medium">
                    {getInitials(review)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-medium text-white">{formatReviewerName(review)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RatingDisplay rating={review.rating} reviewsCount={1} showCount={false} size="sm" />
                        <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedReview(review); setShowFlagDialog(true) }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {review.job_title && (
                    <p className="text-xs text-slate-500 mb-1.5">Job: {review.job_title}</p>
                  )}

                  <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>

                  {review.is_flagged && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-red-400 border border-red-800/50 bg-red-900/20 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="h-3 w-3" />Flagged
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Show all {reviews.length} reviews
          </button>
        )}
        {showAll && reviews.length > DEFAULT_VISIBLE && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-4 text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Show less
          </button>
        )}
      </div>

      {/* Flag Review Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Flag Review</DialogTitle>
            <DialogDescription className="text-slate-400">
              Please provide a reason. Our admin team will review it shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for flagging (e.g., inappropriate content, fake review, spam)"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={3}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowFlagDialog(false); setFlagReason("") }}
              disabled={flagging}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
