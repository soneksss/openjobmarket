"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import {
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { HomeownerApplicationActions } from "./homeowner-application-actions"
import { JobCompletionModal } from "./job-completion-modal"

interface Application {
  id: string
  status: string
  applied_at: string
  cover_letter?: string
  contractor_id: string
  professional_id: string | null
  contractor_profiles?: any
  professional_profiles?: any
}

interface JobDetailsContentProps {
  job: any
  applications: Application[]
  homeownerUserId?: string // The homeowner's user_id for messaging
}

export function HomeownerJobDetailsContent({ job, applications, homeownerUserId }: JobDetailsContentProps) {
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<{
    id: string
    name: string
    profileId: string
  } | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return undefined
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `From £${min.toLocaleString()}`
    if (max) return `Up to £${max.toLocaleString()}`
    return undefined
  }

  const isJobAccepted = job.completion_status === 'accepted'
  const isJobCompleted = job.completion_status === 'completed'
  const acceptedContractorId = job.accepted_contractor_id

  const handleMarkComplete = () => {
    // Find the accepted contractor's details
    const acceptedApp = applications.find(app => app.contractor_id === acceptedContractorId)
    if (acceptedApp && acceptedApp.contractor_profiles) {
      setSelectedContractor({
        id: acceptedApp.contractor_id,
        name: acceptedApp.contractor_profiles.business_name,
        profileId: acceptedApp.contractor_profiles.id,
      })
      setShowCompletionModal(true)
    }
  }

  return (
    <>
      {/* Job Completion Status Badge */}
      {isJobCompleted && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-sm font-medium text-green-900">Job Completed</h3>
                <p className="text-sm text-green-700">
                  This job was completed on {formatDate(job.completed_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as Completed Button */}
      {isJobAccepted && !isJobCompleted && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Contractor Accepted</h3>
                <p className="text-sm text-blue-700">
                  Once the work is completed, mark this job as complete to finalize it
                </p>
              </div>
              <Button
                onClick={handleMarkComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Completed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Section */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Applications ({applications?.length || 0})
          </h2>
        </CardHeader>
        <CardContent>
          {!applications || applications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-sm">
                When contractors or professionals apply for this job, their applications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application: Application) => {
                // Determine if this is a contractor or professional application
                const isContractor = !!application.contractor_profiles
                const profile = isContractor
                  ? application.contractor_profiles
                  : application.professional_profiles

                if (!profile) return null

                const applicantName = isContractor
                  ? profile.business_name
                  : `${profile.first_name} ${profile.last_name}`

                const applicantTitle = isContractor ? profile.trade_specialties?.[0] : profile.title

                const applicantPhoto = isContractor ? profile.profile_picture : profile.profile_photo_url

                const isThisContractorAccepted = acceptedContractorId === application.contractor_id

                return (
                  <div
                    key={application.id}
                    className={`flex items-start justify-between p-4 border rounded-lg transition-colors ${
                      isThisContractorAccepted ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={applicantPhoto} alt={applicantName} />
                        <AvatarFallback>
                          {applicantName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{applicantName}</h4>
                          <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                          {isContractor && <Badge variant="outline">Contractor</Badge>}
                          {isThisContractorAccepted && <Badge className="bg-green-600 text-white">Selected</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{applicantTitle || "Professional"}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2 flex-wrap">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {profile.location || "Location not specified"}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Applied {formatDate(application.applied_at)}
                          </span>
                          {isContractor && profile.experience_years && (
                            <span className="flex items-center">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {profile.experience_years} years experience
                            </span>
                          )}
                          {!isContractor && profile.experience_level && (
                            <span className="flex items-center">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {profile.experience_level}
                            </span>
                          )}
                        </div>

                        {/* Skills/Specialties */}
                        {isContractor && profile.trade_specialties && profile.trade_specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {profile.trade_specialties.slice(0, 5).map((specialty: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {profile.trade_specialties.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{profile.trade_specialties.length - 5} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Cover Letter */}
                        {application.cover_letter && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-md">
                            <p className="text-sm font-medium mb-1">Cover Letter:</p>
                            <p className="text-sm text-gray-700 line-clamp-3">{application.cover_letter}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {isContractor && !isJobCompleted && (
                        <HomeownerApplicationActions
                          applicationId={application.id}
                          contractorId={application.contractor_id}
                          contractorName={applicantName}
                          jobId={job.id}
                          currentStatus={application.status}
                          isJobAlreadyAccepted={!!acceptedContractorId}
                          acceptedContractorId={acceptedContractorId}
                          jobTitle={job.title}
                          jobBudget={formatBudget(job.budget_min, job.budget_max)}
                          homeownerUserId={homeownerUserId}
                        />
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/contractors/${profile.id}`}>
                          View Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Completion Modal */}
      {selectedContractor && (
        <JobCompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false)
            setSelectedContractor(null)
          }}
          jobId={job.id}
          jobTitle={job.title}
          contractorId={selectedContractor.id}
          contractorName={selectedContractor.name}
          contractorProfileId={selectedContractor.profileId}
        />
      )}
    </>
  )
}
