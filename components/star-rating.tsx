"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number // Average rating (e.g., 4.5)
  totalReviews: number
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  className?: string
}

export function StarRating({
  rating,
  totalReviews,
  size = "md",
  showCount = true,
  className
}: StarRatingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]

  // Round to 1 decimal place
  const displayRating = Math.round(rating * 10) / 10

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillPercentage = Math.min(Math.max(rating - star + 1, 0), 1) * 100

          return (
            <div key={star} className="relative">
              {/* Empty star background */}
              <Star className={cn(iconSize, "text-gray-300")} />

              {/* Filled star overlay */}
              <div
                className="absolute top-0 left-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star className={cn(iconSize, "fill-yellow-400 text-yellow-400")} />
              </div>
            </div>
          )
        })}
      </div>

      {showCount && (
        <span className={cn("text-muted-foreground ml-1", textSize)}>
          {displayRating > 0 ? displayRating.toFixed(1) : "0.0"} ({totalReviews})
        </span>
      )}
    </div>
  )
}

interface InteractiveStarRatingProps {
  value: number
  onChange: (rating: number) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function InteractiveStarRating({
  value,
  onChange,
  size = "lg",
  className
}: InteractiveStarRatingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  const iconSize = sizeClasses[size]

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={(e) => {
            // Preview hover effect
            const stars = e.currentTarget.parentElement?.querySelectorAll('button')
            stars?.forEach((s, i) => {
              const starIcon = s.querySelector('svg')
              if (i < star) {
                starIcon?.classList.add('fill-yellow-400', 'text-yellow-400')
                starIcon?.classList.remove('text-gray-300')
              } else {
                starIcon?.classList.remove('fill-yellow-400', 'text-yellow-400')
                starIcon?.classList.add('text-gray-300')
              }
            })
          }}
          onMouseLeave={(e) => {
            // Reset to actual value
            const stars = e.currentTarget.parentElement?.querySelectorAll('button')
            stars?.forEach((s, i) => {
              const starIcon = s.querySelector('svg')
              if (i < value) {
                starIcon?.classList.add('fill-yellow-400', 'text-yellow-400')
                starIcon?.classList.remove('text-gray-300')
              } else {
                starIcon?.classList.remove('fill-yellow-400', 'text-yellow-400')
                starIcon?.classList.add('text-gray-300')
              }
            })
          }}
          className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
        >
          <Star
            className={cn(
              iconSize,
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  )
}
