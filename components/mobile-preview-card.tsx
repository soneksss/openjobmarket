"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  PoundSterling,
  X,
  ExternalLink,
  MessageCircle,
  Building,
  Briefcase,
  Star,
  ChevronRight,
  Clock,
  Globe,
  Phone,
  CheckCircle,
} from "lucide-react"
import { CompactStarRating } from "@/components/compact-star-rating"

// Job preview data
interface JobPreviewData {
  type: "job"
  id: string
  title: string
  companyName?: string
  posterName?: string
  location: string
  salaryMin?: number
  salaryMax?: number
  budgetMin?: number
  budgetMax?: number
  description?: string
  jobType?: string
  workLocation?: string
  createdAt?: string
}

// Professional preview data
interface ProfessionalPreviewData {
  type: "professional"
  id: string
  firstName?: string
  lastName?: string
  title?: string
  bio?: string
  location: string
  avatarUrl?: string
  salaryMin?: number
  salaryMax?: number
  salaryFrequency?: string
  skills?: string[]
  averageRating?: number
  reviewsCount?: number
  experienceLevel?: string
  isAvailable?: boolean
  isSelfEmployed?: boolean
  spokenLanguages?: string[]
}

// Company preview data
interface CompanyPreviewData {
  type: "company"
  id: string
  companyName: string
  industry?: string
  description?: string
  location: string
  logoUrl?: string
  services?: string[]
  openForBusiness?: boolean
  isHiring?: boolean
  phone?: string
  websiteUrl?: string
  spokenLanguages?: string[]
}

export type PreviewData = JobPreviewData | ProfessionalPreviewData | CompanyPreviewData

interface MobilePreviewCardProps {
  data: PreviewData
  onClose: () => void
  onViewDetails: (id: string) => void
  onAction?: (id: string, name: string) => void
  actionLabel?: string
  actionDisabled?: boolean
  showAction?: boolean
  isAuthenticated?: boolean
  onAuthRequired?: () => void
}

export function MobilePreviewCard({
  data,
  onClose,
  onViewDetails,
  onAction,
  actionLabel = "View Details",
  actionDisabled = false,
  showAction = true,
  isAuthenticated = false,
  onAuthRequired,
}: MobilePreviewCardProps) {
  const handleActionClick = () => {
    if (!isAuthenticated && onAuthRequired) {
      onAuthRequired()
      return
    }
    if (onAction) {
      const name = data.type === "job"
        ? data.title
        : data.type === "professional"
        ? `${data.firstName || ""} ${data.lastName || ""}`.trim()
        : data.companyName
      onAction(data.id, name)
    }
  }

  const formatSalary = (min?: number, max?: number, prefix = "£") => {
    if (min && max) {
      return `${prefix}${min.toLocaleString()} - ${prefix}${max.toLocaleString()}`
    }
    if (min) return `From ${prefix}${min.toLocaleString()}`
    if (max) return `Up to ${prefix}${max.toLocaleString()}`
    return null
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Posted today"
    if (diffDays <= 7) return `Posted ${diffDays} days ago`
    if (diffDays <= 30) return `Posted ${Math.ceil(diffDays / 7)} weeks ago`
    return `Posted ${date.toLocaleDateString()}`
  }

  // Render job expanded card
  if (data.type === "job") {
    const salary = formatSalary(data.salaryMin || data.budgetMin, data.salaryMax || data.budgetMax)

    return (
      <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom-4 duration-300">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-20">
          {/* Header with close button */}
          <div className="sticky top-0 bg-slate-900 z-10 px-4 pt-4 pb-3 border-b border-slate-700">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-lg text-white leading-tight">{data.title}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {data.companyName || data.posterName || "Anonymous"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 -mt-1 -mr-1"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Key Info */}
            <div className="flex flex-wrap gap-2">
              {data.jobType && (
                <Badge className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {data.jobType}
                </Badge>
              )}
              {data.workLocation && (
                <Badge className="text-xs bg-slate-800 text-slate-300 border border-slate-600">
                  {data.workLocation}
                </Badge>
              )}
            </div>

            {/* Location and Salary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span>{data.location}</span>
              </div>
              {salary && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <PoundSterling className="h-4 w-4 flex-shrink-0" />
                  <span>{salary}</span>
                </div>
              )}
              {data.createdAt && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formatDate(data.createdAt)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {data.description && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">Job Description</h4>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {data.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 flex gap-3 shadow-lg">
          <Button
            variant="outline"
            className="flex-1 h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => onViewDetails(data.id)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {showAction && (
            <Button
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600"
              onClick={handleActionClick}
              disabled={actionDisabled}
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render professional expanded card
  if (data.type === "professional") {
    const salary = formatSalary(data.salaryMin, data.salaryMax)
    const initials = `${data.firstName?.[0] || ""}${data.lastName?.[0] || ""}`

    return (
      <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom-4 duration-300">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 z-10 px-4 pt-4 pb-3 border-b border-slate-700">
            <div className="flex items-start gap-3">
              <Avatar className="h-16 w-16 flex-shrink-0 ring-2 ring-slate-700">
                <AvatarImage src={data.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-lg text-white">
                      {data.firstName} {data.lastName}
                    </h3>
                    <p className="text-sm text-slate-400">{data.title}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 -mt-1 -mr-1"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
                {/* Rating */}
                {data.reviewsCount !== undefined && data.reviewsCount > 0 && (
                  <div className="mt-1.5">
                    <CompactStarRating
                      rating={data.averageRating || 0}
                      reviewCount={data.reviewsCount}
                      size="sm"
                      showCount={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              {data.isAvailable && (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              )}
              {data.experienceLevel && (
                <Badge className="text-xs capitalize bg-slate-700 text-slate-200 border-slate-600">
                  {data.experienceLevel}
                </Badge>
              )}
              {data.isSelfEmployed && (
                <Badge className="text-xs bg-slate-800 text-slate-300 border border-slate-600">
                  Self-Employed
                </Badge>
              )}
            </div>

            {/* Location and Salary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span>{data.location}</span>
              </div>
              {salary && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <PoundSterling className="h-4 w-4 flex-shrink-0" />
                  <span>{salary}{data.salaryFrequency ? ` (${data.salaryFrequency})` : ""}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {data.bio && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">About</h4>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {data.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {data.skills && data.skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.skills.map((skill, idx) => (
                    <Badge key={idx} className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {data.spokenLanguages && data.spokenLanguages.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">Languages</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.spokenLanguages.map((lang, idx) => (
                    <Badge key={idx} className="text-xs bg-slate-800 text-slate-300 border border-slate-600">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 flex gap-3 shadow-lg">
          <Button
            variant="outline"
            className="flex-1 h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => onViewDetails(data.id)}
          >
            View Profile
          </Button>
          {showAction && (
            <Button
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600"
              onClick={handleActionClick}
              disabled={actionDisabled}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render company expanded card
  if (data.type === "company") {
    return (
      <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom-4 duration-300">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 z-10 px-4 pt-4 pb-3 border-b border-slate-700">
            <div className="flex items-start gap-3">
              <Avatar className="h-16 w-16 flex-shrink-0 rounded-xl ring-2 ring-slate-700">
                <AvatarImage src={data.logoUrl} className="object-cover rounded-xl" />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold text-lg rounded-xl">
                  {data.companyName?.[0] || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-lg text-white">{data.companyName}</h3>
                    <p className="text-sm text-slate-400">{data.industry}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 -mt-1 -mr-1"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
                {/* Status badges */}
                <div className="flex gap-1.5 mt-2">
                  {data.openForBusiness && (
                    <Badge className="bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Open
                    </Badge>
                  )}
                  {data.isHiring && (
                    <Badge className="bg-blue-900/40 text-blue-400 border border-blue-700/50 text-xs">
                      Hiring
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span>{data.location}</span>
              </div>
              {data.phone && (
                <a
                  href={`tel:${data.phone}`}
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{data.phone}</span>
                </a>
              )}
              {data.websiteUrl && (
                <a
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{data.websiteUrl}</span>
                </a>
              )}
            </div>

            {/* Description */}
            {data.description && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">About</h4>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {data.description}
                </p>
              </div>
            )}

            {/* Services */}
            {data.services && data.services.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">Services</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.services.map((service, idx) => (
                    <Badge key={idx} className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {data.spokenLanguages && data.spokenLanguages.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-white mb-2">Languages</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.spokenLanguages.map((lang, idx) => (
                    <Badge key={idx} className="text-xs bg-slate-800 text-slate-300 border border-slate-600">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 flex gap-3 shadow-lg">
          <Button
            variant="outline"
            className="flex-1 h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => onViewDetails(data.id)}
          >
            <Building className="h-4 w-4 mr-2" />
            View Company
          </Button>
          {showAction && (
            <Button
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600"
              onClick={handleActionClick}
              disabled={actionDisabled}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return null
}
