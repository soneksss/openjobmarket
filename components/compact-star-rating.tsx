"use client"

import { Star } from "lucide-react"

interface CompactStarRatingProps {
  rating: number // Average rating (0-5)
  reviewCount: number // Total number of reviews
  size?: "sm" | "md" | "lg"
  showCount?: boolean
}

export function CompactStarRating({
  rating,
  reviewCount,
  size = "sm",
  showCount = true,
}: CompactStarRatingProps) {
  // Default to 5 stars with 0 reviews if no rating
  const displayRating = rating || 5
  const displayCount = reviewCount || 0

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]

  // Render 5 stars
  const stars = []
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= Math.round(displayRating)
    stars.push(
      <Star
        key={i}
        className={`${iconSize} ${
          isFilled
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        }`}
      />
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">{stars}</div>
      {showCount && (
        <span className={`${textSize} text-gray-600 font-medium`}>
          ({displayCount})
        </span>
      )}
    </div>
  )
}
