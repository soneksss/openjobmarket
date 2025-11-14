"use client"

import { useState, useEffect, forwardRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Building, Clock, Users, Briefcase, Heart, ExternalLink, ChevronDown, ChevronUp, MessageCircle, User as UserIcon } from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  description: string
  short_description?: string
  long_description?: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  full_address?: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  company_profiles?: {
    company_name: string
    location: string
    industry: string
    logo_url?: string
  } | null
  poster_type?: 'company' | 'individual'
  poster_first_name?: string
  poster_last_name?: string
  poster_logo_url?: string
}

interface JobCardProps {
  job: Job
  isLoggedIn: boolean
  isSelected?: boolean
  onSelect?: () => void
}

const JobCard = forwardRef<HTMLDivElement, JobCardProps>(({ job, isLoggedIn, isSelected = false, onSelect }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSignUpDialog, setShowSignUpDialog] = useState(false)

  // Auto-expand when selected from map pin click or card click
  // Auto-collapse when deselected (another job is selected)
  useEffect(() => {
    setIsExpanded(isSelected)
  }, [isSelected])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const formatAddress = (fullAddress?: string) => {
    if (!fullAddress) return null

    // Extract street name (first part before comma)
    const parts = fullAddress.split(',').map(p => p.trim())
    const street = parts[0]

    // Extract UK postcode using regex (e.g., PO9 3AT, SW1A 1AA, etc.)
    const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i
    const postcodeMatch = fullAddress.match(postcodeRegex)
    const postcode = postcodeMatch ? postcodeMatch[0] : null

    // Return simplified format: "Street, Postcode"
    if (street && postcode) {
      return `${street}, ${postcode}`
    }

    // Fallback to just street if no postcode found
    return street || fullAddress
  }

  const salary = formatSalary(job.salary_min, job.salary_max)
  const topSkills = job.skills_required?.slice(0, 3) || []

  // Determine poster information
  const posterName =
    (job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
    job.company_profiles?.company_name ||
    "Anonymous"

  const companyName = job.company_profiles?.company_name
  const logoUrl = job.poster_logo_url || job.company_profiles?.logo_url

  // Use short_description if available, otherwise use description
  const shortDesc = job.short_description || job.description
  const longDesc = job.long_description || job.description

  // Format address for display
  const displayAddress = formatAddress(job.full_address || job.location)

  const handleContactClick = () => {
    if (!isLoggedIn) {
      setShowSignUpDialog(true)
    } else {
      // Handle contact logic for logged-in users
      window.location.href = `/messages/new?jobId=${job.id}`
    }
  }

  const handleViewProfileClick = () => {
    if (!isLoggedIn) {
      setShowSignUpDialog(true)
    } else {
      // Handle view profile logic for logged-in users
      window.location.href = `/jobs/${job.id}`
    }
  }

  return (
    <>
      <Card
        ref={ref}
        className={`group hover:shadow-lg transition-shadow duration-200 border cursor-pointer ${
          isSelected
            ? "shadow-xl border-2 border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => {
          // Let the parent handle selection, which will update isSelected
          // The useEffect will then update isExpanded based on isSelected
          onSelect?.()
        }}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Job Details */}
            <div className="flex-1 min-w-0">
              {/* Job Title */}
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {job.title}
              </h3>

              {/* Short Description */}
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {isExpanded ? longDesc : (shortDesc?.substring(0, 120) + (shortDesc && shortDesc.length > 120 ? "..." : ""))}
              </p>

              {/* Price */}
              {salary && (
                <div className="text-sm font-bold text-green-600 mb-2">
                  {salary} <span className="text-gray-500 font-normal">(per job)</span>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Location */}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{displayAddress}</span>
                  </div>

                  {/* Job Type Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {job.job_type}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                      {job.work_location}
                    </Badge>
                  </div>

                  {/* Skills */}
                  {topSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-green-50 border-green-200 text-green-700"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {job.skills_required?.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{job.skills_required.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{job.applications_count} applications</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:bg-gray-50"
                      disabled={!isLoggedIn}
                      onClick={(e) => {
                        e.stopPropagation()
                        !isLoggedIn && setShowSignUpDialog(true)
                      }}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      Save
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContactClick()
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Contact
                    </Button>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewProfileClick()
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Up Dialog */}
      <Dialog open={showSignUpDialog} onOpenChange={setShowSignUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Sign Up Required</DialogTitle>
            <DialogDescription className="text-center text-lg pt-4">
              Sign up to send messages or view profiles
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/auth/sign-up">
                Create Account
              </Link>
            </Button>
            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Log in
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

JobCard.displayName = "JobCard"

export default JobCard
