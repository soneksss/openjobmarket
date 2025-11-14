"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, MessageCircle, Eye, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompactStarRating } from "@/components/compact-star-rating"

interface CompactProfilePreviewProps {
  id: string
  firstName: string
  lastName: string
  title: string
  location: string
  profilePhotoUrl?: string
  skills: string[]
  salaryMin?: number
  salaryMax?: number
  experienceLevel?: string
  isAvailable?: boolean
  rating?: number
  reviewCount?: number
  onContact?: () => void
  onPreview?: () => void
}

export function CompactProfilePreview({
  id,
  firstName,
  lastName,
  title,
  location,
  profilePhotoUrl,
  skills,
  salaryMin,
  salaryMax,
  experienceLevel,
  isAvailable = true,
  rating,
  reviewCount,
  onContact,
  onPreview,
}: CompactProfilePreviewProps) {
  const router = useRouter()

  const nickname = `${firstName} ${lastName.charAt(0)}.`

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) {
      return `£${(min / 1000).toFixed(0)}k - £${(max / 1000).toFixed(0)}k`
    }
    if (min) return `£${(min / 1000).toFixed(0)}k+`
    return `Up to £${(max! / 1000).toFixed(0)}k`
  }

  const handleContact = () => {
    if (onContact) {
      onContact()
    } else {
      router.push("/auth/login")
    }
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview()
    } else {
      router.push(`/professionals/${id}`)
    }
  }

  const displaySkills = skills.slice(0, 3)
  const salaryDisplay = formatSalary(salaryMin, salaryMax)

  return (
    <div className="w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-blue-100">
            <AvatarImage src={profilePhotoUrl} alt={nickname} />
            <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
              {firstName.charAt(0)}{lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{nickname}</h3>
            <p className="text-sm text-gray-600 truncate">{title}</p>
            {experienceLevel && (
              <Badge variant="outline" className="text-xs mt-1 capitalize">
                {experienceLevel}
              </Badge>
            )}
          </div>
        </div>

        {/* Star Rating - Always visible with default 5 stars */}
        <div className="mt-2">
          <CompactStarRating
            rating={rating || 5}
            reviewCount={reviewCount || 0}
            size="sm"
            showCount={true}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-3">
        {/* Location */}
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Salary and Availability */}
        <div className="space-y-1">
          {salaryDisplay && (
            <div className="flex items-center text-sm text-green-600">
              <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="font-medium">{salaryDisplay}</span>
            </div>
          )}
          {isAvailable && (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                Available
              </Badge>
            </div>
          )}
        </div>

        {/* Skills */}
        {displaySkills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Key Skills:</p>
            <div className="flex flex-wrap gap-1">
              {displaySkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                  +{skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleContact}
            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Contact
          </Button>
          <Button
            onClick={handlePreview}
            variant="outline"
            className="flex-1 h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
        </div>
      </div>
    </div>
  )
}