"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Briefcase,
  MapPin,
  Search,
  Calendar,
  FileText,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"

interface CompanyProfile {
  id: string
  company_name: string
}

interface Application {
  id: string
  status: string
  applied_at: string
  cover_letter?: string
  professional_id?: string | null
  company_id?: string | null
  jobs: {
    id: string
    title: string
  }
  professional_profiles?: {
    id: string
    first_name: string
    last_name: string
    title: string
    location: string
    skills: string[]
    experience_level: string
    portfolio_url?: string
    linkedin_url?: string
    github_url?: string
    user_id?: string
    phone?: string
  } | null
  company_profiles?: {
    id: string
    company_name: string
    industry: string
    location: string
    logo_url?: string
    user_id?: string
    company_size?: string
    website?: string
  } | null
}

interface CompanyApplicationsManagerProps {
  profile: CompanyProfile
  applications: Application[]
}

export default function CompanyApplicationsManager({ profile, applications: initialApplications }: CompanyApplicationsManagerProps) {
  const [applications, setApplications] = useState(initialApplications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [jobFilter, setJobFilter] = useState<string>("all")

  useEffect(() => {
    setApplications(initialApplications)
  }, [initialApplications])

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const uniqueJobs = Array.from(new Set(applications.map((app) => app.jobs.id))).map((jobId) => {
    const app = applications.find((a) => a.jobs.id === jobId)
    return { id: jobId, title: app?.jobs.title || "" }
  })

  const filteredApplications = applications.filter((application) => {
    let searchString = application.jobs.title.toLowerCase()
    if (application.professional_profiles) {
      searchString += ` ${application.professional_profiles.first_name} ${application.professional_profiles.last_name} ${application.professional_profiles.title}`
    } else if (application.company_profiles) {
      searchString += ` ${application.company_profiles.company_name} ${application.company_profiles.industry}`
    }
    const matchesSearch = searchString.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || application.status === statusFilter
    const matchesJob = jobFilter === "all" || application.jobs.id === jobFilter
    return matchesSearch && matchesStatus && matchesJob
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":   return "bg-slate-100 text-slate-800"
      case "reviewed":  return "bg-blue-100 text-blue-800"
      case "interview": return "bg-purple-100 text-purple-800"
      case "accepted":  return "bg-green-100 text-green-800"
      case "rejected":  return "bg-red-100 text-red-800"
      default:          return "bg-gray-100 text-gray-800"
    }
  }

  const formatDateShort = (dateString: string) => new Date(dateString).toLocaleDateString()

  return (
    <div className="min-h-screen bg-slate-900 md:bg-gray-50">
      <div className="container mx-auto px-4 py-3">
        <div className="mb-3">
          <h1 className="text-xl md:text-2xl font-bold mb-0.5 text-white md:text-gray-900">Applications</h1>
          <p className="text-xs md:text-sm text-slate-400 md:text-gray-600">
            Review and manage applications for {profile.company_name} job postings
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-3 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base text-white md:text-gray-900">Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 md:text-gray-400" />
                  <Input
                    placeholder="Search by candidate name, title, or job..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 md:placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {uniqueJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card className="bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-slate-500 md:text-gray-400 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-white md:text-gray-900">
                {applications.length === 0 ? "No applications yet" : "No applications match your filters"}
              </h3>
              <p className="text-slate-400 md:text-gray-600">
                {applications.length === 0
                  ? "Applications will appear here when candidates apply to your jobs."
                  : "Try adjusting your search terms or filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((application) => {
              const isCompanyApplicant = !!application.company_id && !!application.company_profiles
              const isProfessionalApplicant = !!application.professional_id && !!application.professional_profiles

              const displayName = isCompanyApplicant
                ? application.company_profiles!.company_name
                : isProfessionalApplicant
                ? `${application.professional_profiles!.first_name} ${application.professional_profiles!.last_name}`
                : "Unknown Applicant"

              const displayTitle = isCompanyApplicant
                ? application.company_profiles!.industry
                : isProfessionalApplicant
                ? application.professional_profiles!.title
                : ""

              const displayLocation = isCompanyApplicant
                ? application.company_profiles!.location
                : isProfessionalApplicant
                ? application.professional_profiles!.location
                : "Location not specified"

              const displayInitials = isCompanyApplicant
                ? application.company_profiles!.company_name.substring(0, 2).toUpperCase()
                : isProfessionalApplicant
                ? `${application.professional_profiles!.first_name[0]}${application.professional_profiles!.last_name[0]}`
                : "?"

              return (
                <Link key={application.id} href={`/dashboard/company/applications/${application.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-emerald-900/50 md:bg-blue-100 text-emerald-400 md:text-blue-600 text-sm">
                            {displayInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-semibold truncate text-white md:text-gray-900">
                              {displayName}
                            </h3>
                            {isCompanyApplicant && (
                              <Badge variant="secondary" className="text-xs shrink-0">Company</Badge>
                            )}
                            <Badge className={`${getStatusColor(application.status)} text-xs shrink-0`}>{application.status}</Badge>
                          </div>

                          {displayTitle && (
                            <p className="text-xs text-slate-400 md:text-gray-500 mb-1.5">{displayTitle}</p>
                          )}

                          {application.cover_letter && (
                            <div className="bg-slate-700/50 md:bg-gray-100 p-2 rounded mb-1.5">
                              <p className="text-xs text-slate-300 md:text-gray-600 italic line-clamp-2">
                                "{truncateText(application.cover_letter, 100)}"
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 md:text-gray-500">
                            <span className="flex items-center">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {application.jobs.title}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {displayLocation}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDateShort(application.applied_at)}
                            </span>
                          </div>
                        </div>

                        <ChevronDown className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0 mt-1 -rotate-90" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}