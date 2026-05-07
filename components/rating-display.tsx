"use client"

import { Star, StarHalf } from "lucide-react"

interface RatingDisplayProps {
  rating: number
  reviewsCount: number
  showCount?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RatingDisplay({
  rating,
  reviewsCount,
  showCount = true,
  size = "md",
  className = ""
}: RatingDisplayProps) {
  // Clamp rating between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, rating))

  // Size configurations
  const sizeConfig = {
    sm: {
      starSize: "h-3 w-3",
      textSize: "text-xs",
      gap: "gap-0.5"
    },
    md: {
      starSize: "h-4 w-4",
      textSize: "text-sm",
      gap: "gap-1"
    },
    lg: {
      starSize: "h-5 w-5",
      textSize: "text-base",
      gap: "gap-1.5"
    }
  }

  const config = sizeConfig[size]

  // Render stars
  const renderStars = () => {
    const stars: React.ReactElement[] = []
    const fullStars = Math.floor(clampedRating)
    const hasHalfStar = clampedRating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className={`${config.starSize} fill-yellow-400 text-yellow-400`}
        />
      )
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <StarHalf
          key="half"
          className={`${config.starSize} fill-yellow-400 text-yellow-400`}
        />
      )
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className={`${config.starSize} text-gray-300`}
        />
      )
    }

    return stars
  }

  if (reviewsCount === 0) {
    return (
      <div className={`flex items-center ${config.gap} text-gray-400 ${className}`}>
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`${config.starSize} text-gray-300`} />
          ))}
        </div>
        <span className={config.textSize}>No reviews yet</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      <div className="flex items-center">
        {renderStars()}
      </div>
      <span className={`${config.textSize} font-medium text-gray-900`}>
        {clampedRating.toFixed(1)}
      </span>
      {showCount && (
        <span className={`${config.textSize} text-gray-600`}>
          ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  )
}

// Alternative: Star rating input component for submitting reviews
interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  disabled = false
}: StarRatingInputProps) {
  const sizeConfig = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  }

  const starSize = sizeConfig[size]

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          className={`
            transition-all
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
          `}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            className={`
              ${starSize}
              transition-colors
              ${star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
              }
            `}
          />
        </button>
      ))}
    </div>
  )
}
