"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, ThumbsUp, MessageSquare, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  updated_at: string
  is_edited: boolean
  reviewer: {
    type: string
    name: string
    photo_url: string | null
  }
}

interface ReviewStats {
  total_reviews: number
  average_rating: number
  five_star_count: number
  four_star_count: number
  three_star_count: number
  two_star_count: number
  one_star_count: number
}

interface UserReviewsDisplayProps {
  userId: string
  showStats?: boolean
  initialLimit?: number
}

export default function UserReviewsDisplay({ userId, showStats = true, initialLimit = 5 }: UserReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState<boolean>(false)

  useEffect(() => {
    fetchReviews()
    if (showStats) {
      fetchStats()
    }
  }, [userId])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?userId=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to load reviews")
        return
      }

      setReviews(data.reviews || [])
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setError("Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/reviews/stats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error("Error fetching review stats:", err)
    }
  }

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, initialLimit)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    )
  }

  const averageRating = stats?.average_rating || (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span>Reviews & Ratings</span>
            </CardTitle>
            {reviews.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                  {renderStars(Math.round(averageRating), "md")}
                </div>
                <span className="text-sm text-muted-foreground">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Distribution */}
        {showStats && stats && reviews.length > 0 && (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (stats as any)[`${["one", "two", "three", "four", "five"][star - 1]}_star_count`] || 0
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0

              return (
                <div key={star} className="flex items-center space-x-2 text-sm">
                  <span className="w-12 flex items-center justify-end">{star} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm">Be the first to leave a review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedReviews.map((review) => (
              <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarImage src={review.reviewer.photo_url || undefined} alt={review.reviewer.name} />
                    <AvatarFallback>{review.reviewer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{review.reviewer.name}</p>
                        <div className="flex items-center space-x-2">
                          {renderStars(review.rating, "sm")}
                          <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                          {review.is_edited && (
                            <Badge variant="outline" className="text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.review_text && <p className="text-sm text-foreground">{review.review_text}</p>}
                  </div>
                </div>
              </div>
            ))}

            {reviews.length > initialLimit && (
              <Button variant="outline" onClick={() => setShowAll(!showAll)} className="w-full">
                {showAll ? "Show Less" : `View All ${reviews.length} Reviews`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
