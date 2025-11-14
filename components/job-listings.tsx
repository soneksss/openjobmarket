"use client"

import JobSearchHeader from "./job-search-header"
import JobCard from "./job-card"
import { Button } from "@/components/ui/button"
import { Briefcase, Map } from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  description: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  company_profiles: {
    company_name: string
    location: string
    industry: string
  }
}

interface User {
  id: string
  email: string
}

interface JobListingsProps {
  jobs: Job[]
  user: User | null
  searchParams: {
    search?: string
    location?: string
    type?: string
    level?: string
    salaryMin?: string
    salaryMax?: string
  }
}

export default function JobListings({ jobs, user, searchParams }: JobListingsProps) {
  return (
    <div className="bg-gray-50">
      {/* Search Header */}
      <JobSearchHeader searchParams={searchParams} />

      {/* Job Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {jobs.length} Job{jobs.length !== 1 ? "s" : ""} Found
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Find your perfect role from the latest opportunities
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border">
              <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No jobs found</h3>
              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or browse all available positions.
              </p>
              <Button asChild>
                <Link href="/jobs">Browse All Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isLoggedIn={!!user}
                />
              ))}

              {/* Pagination placeholder */}
              {jobs.length >= 50 && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Showing first 50 results</p>
                  <Button variant="outline">Load More Jobs</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
