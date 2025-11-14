"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Eye, Bookmark, Users, Clock, DollarSign } from "lucide-react"
import { createClient } from "@/lib/client"

interface Job {
  id: string
  title: string
  company_id: string
  location: string
  latitude: number
  longitude: number
  salary_min: number
  salary_max: number
  salary_frequency: string
  job_type: string
  experience_level: string
  views_count: number
  applications_count: number
  created_at: string
  recruitment_timeline: string
  is_active: boolean
  company_profiles: {
    company_name: string
    logo_url: string
  }
}

interface JobMapProps {
  className?: string
}

export function InteractiveJobMap({ className }: JobMapProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapCenter, setMapCenter] = useState({ lat: 51.5074, lng: -0.1278 }) // London default
  const [zoom, setZoom] = useState(10)

  const supabase = createClient()

  useEffect(() => {
    fetchActiveJobs()
  }, [])

  const fetchActiveJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          company_profiles (
            company_name,
            logo_url
          )
        `)
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error("Error fetching jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (min: number, max: number, frequency: string) => {
    const formatNumber = (num: number) => {
      if (num >= 1000) return `£${(num / 1000).toFixed(0)}k`
      return `£${num}`
    }

    const freqText = frequency === "yearly" ? "/year" : frequency === "monthly" ? "/month" : "/hour"

    if (min && max) {
      return `${formatNumber(min)} - ${formatNumber(max)}${freqText}`
    } else if (min) {
      return `From ${formatNumber(min)}${freqText}`
    } else if (max) {
      return `Up to ${formatNumber(max)}${freqText}`
    }
    return "Salary not specified"
  }

  const getJobTypeColor = (jobType: string) => {
    switch (jobType.toLowerCase()) {
      case "full-time":
        return "bg-blue-100 text-blue-800"
      case "part-time":
        return "bg-green-100 text-green-800"
      case "contract":
        return "bg-orange-100 text-orange-800"
      case "freelance":
        return "bg-purple-100 text-purple-800"
      case "internship":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleJobClick = (job: Job) => {
    setSelectedJob(job)
    setMapCenter({ lat: job.latitude, lng: job.longitude })
    setZoom(14)
  }

  const handleApplyClick = (jobId: string) => {
    // Navigate to job detail page for application
    window.open(`/jobs/${jobId}`, "_blank")
  }

  const handleSaveJob = async (jobId: string) => {
    // TODO: Implement save job functionality
    console.log("Save job:", jobId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid lg:grid-cols-3 gap-6 ${className}`}>
      {/* Map Container */}
      <div className="lg:col-span-2">
        <Card className="h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Job Locations ({jobs.length} active jobs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Simplified map representation - in production, use Google Maps or Mapbox */}
            <div className="relative h-full bg-muted rounded-b-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Interactive Map</h3>
                  <p className="text-muted-foreground mb-4">Click on jobs in the sidebar to view their locations</p>
                  <div className="text-sm text-muted-foreground">
                    Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)} | Zoom: {zoom}
                  </div>
                </div>
              </div>

              {/* Job pins overlay */}
              {jobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all duration-200 ${
                    selectedJob?.id === job.id ? "bg-red-500 scale-125 z-10" : "bg-primary hover:scale-110"
                  }`}
                  style={{
                    left: `${20 + (index % 5) * 15}%`,
                    top: `${20 + Math.floor(index / 5) * 15}%`,
                  }}
                  onClick={() => handleJobClick(job)}
                  title={`${job.title} at ${job.company_profiles?.company_name}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job List Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[520px] overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No active jobs found</div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedJob?.id === job.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="space-y-3">
                      {/* Job Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.company_profiles?.company_name}</p>
                        </div>
                        {job.company_profiles?.logo_url && (
                          <img
                            src={job.company_profiles.logo_url || "/placeholder.svg"}
                            alt={job.company_profiles.company_name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                      </div>

                      {/* Job Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{job.location}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatSalary(job.salary_min, job.salary_max, job.salary_frequency)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getJobTypeColor(job.job_type)}>
                            {job.job_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {job.experience_level}
                          </Badge>
                        </div>
                      </div>

                      {/* Job Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {job.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {job.applications_count}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{job.recruitment_timeline}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {selectedJob?.id === job.id && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApplyClick(job.id)
                            }}
                            className="flex-1"
                          >
                            Apply Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveJob(job.id)
                            }}
                          >
                            <Bookmark className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
