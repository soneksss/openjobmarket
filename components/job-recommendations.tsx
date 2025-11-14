"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, MapPin, Clock, Building, Heart } from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  company_name: string
  location: string
  job_type: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  match_score: number
  match_reasons: string[]
  created_at: string
}

interface JobRecommendationsProps {
  userId: string
  userSkills: string[]
  userLocation: string
  userExperience: string
}

export default function JobRecommendations({
  userId,
  userSkills,
  userLocation,
  userExperience,
}: JobRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      // This would be replaced with actual API call
      const mockRecommendations: Job[] = [
        {
          id: "1",
          title: "Senior React Developer",
          company_name: "TechCorp Inc",
          location: "San Francisco, CA",
          job_type: "full-time",
          salary_min: 120000,
          salary_max: 160000,
          skills_required: ["React", "TypeScript", "Node.js"],
          match_score: 95,
          match_reasons: ["Skills match: React, TypeScript", "Location preference", "Experience level match"],
          created_at: "2024-01-15",
        },
        {
          id: "2",
          title: "Full Stack Engineer",
          company_name: "StartupXYZ",
          location: "Remote",
          job_type: "full-time",
          salary_min: 100000,
          salary_max: 140000,
          skills_required: ["JavaScript", "Python", "AWS"],
          match_score: 88,
          match_reasons: ["Remote work preference", "Skills overlap: JavaScript", "Growth opportunity"],
          created_at: "2024-01-14",
        },
      ]
      setRecommendations(mockRecommendations)
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveJob = async (jobId: string) => {
    try {
      // API call to save job
      setSavedJobs((prev) => new Set([...prev, jobId]))
    } catch (error) {
      console.error("Failed to save job:", error)
    }
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const getMatchColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50"
    if (score >= 80) return "text-blue-600 bg-blue-50"
    if (score >= 70) return "text-indigo-600 bg-indigo-50"
    return "text-gray-600 bg-gray-50"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Job Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Job Recommendations
          <Badge variant="secondary" className="ml-auto">
            <TrendingUp className="h-3 w-3 mr-1" />
            Personalized
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recommendations.map((job) => (
            <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link href={`/jobs/${job.id}`} className="text-lg font-semibold text-primary hover:underline">
                    {job.title}
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {job.company_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.job_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchColor(job.match_score)}`}>
                    {job.match_score}% match
                  </div>
                  {formatSalary(job.salary_min, job.salary_max) && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {job.skills_required.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {job.skills_required.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{job.skills_required.length - 4} more
                  </Badge>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Why this matches you:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {job.match_reasons.map((reason, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => saveJob(job.id)} disabled={savedJobs.has(job.id)}>
                  <Heart className={`h-4 w-4 mr-1 ${savedJobs.has(job.id) ? "fill-current text-red-500" : ""}`} />
                  {savedJobs.has(job.id) ? "Saved" : "Save"}
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/jobs/${job.id}`}>View Details</Link>
                </Button>
              </div>
            </div>
          ))}

          <div className="text-center pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/jobs">View All Jobs</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
