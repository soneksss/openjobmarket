"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, MapPin, Filter, X, ChevronDown } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface JobSearchHeaderProps {
  searchParams: {
    search?: string
    location?: string
    type?: string
    level?: string
    salaryMin?: string
    salaryMax?: string
  }
}

export default function JobSearchHeader({ searchParams }: JobSearchHeaderProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [locationFilter, setLocationFilter] = useState(searchParams.location || "")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Advanced filter states
  const [jobType, setJobType] = useState(searchParams.type || "all")
  const [experienceLevel, setExperienceLevel] = useState(searchParams.level || "all")
  const [salaryMin, setSalaryMin] = useState(searchParams.salaryMin || "")
  const [salaryMax, setSalaryMax] = useState(searchParams.salaryMax || "")
  const [salaryFrequency, setSalaryFrequency] = useState((searchParams as any).salaryPeriod || "per_year")

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set("search", searchTerm.trim())
    if (locationFilter.trim()) params.set("location", locationFilter.trim())
    if (jobType && jobType !== "all") params.set("type", jobType)
    if (experienceLevel && experienceLevel !== "all") params.set("level", experienceLevel)
    if (salaryMin.trim()) params.set("salaryMin", salaryMin.trim())
    if (salaryMax.trim()) params.set("salaryMax", salaryMax.trim())
    if (salaryFrequency && salaryFrequency !== "per_year") params.set("salaryPeriod", salaryFrequency)

    router.push(`/jobs?${params.toString()}`)
  }

  const clearFilter = (filterKey: string) => {
    const params = new URLSearchParams(currentSearchParams.toString())
    params.delete(filterKey)
    router.push(`/jobs?${params.toString()}`)

    // Update local state
    switch (filterKey) {
      case "search":
        setSearchTerm("")
        break
      case "location":
        setLocationFilter("")
        break
      case "type":
        setJobType("all")
        break
      case "level":
        setExperienceLevel("all")
        break
      case "salaryMin":
        setSalaryMin("")
        break
      case "salaryMax":
        setSalaryMax("")
        break
      case "salaryPeriod":
        setSalaryFrequency("per_year")
        break
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setLocationFilter("")
    setJobType("all")
    setExperienceLevel("all")
    setSalaryMin("")
    setSalaryMax("")
    setSalaryFrequency("per_year")
    router.push("/jobs")
  }

  const activeFilters = [
    ...(searchParams.search ? [{ key: "search", label: `"${searchParams.search}"`, value: searchParams.search }] : []),
    ...(searchParams.location ? [{ key: "location", label: `📍 ${searchParams.location}`, value: searchParams.location }] : []),
    ...(searchParams.type && searchParams.type !== "all" ? [{ key: "type", label: searchParams.type, value: searchParams.type }] : []),
    ...(searchParams.level && searchParams.level !== "all" ? [{ key: "level", label: searchParams.level, value: searchParams.level }] : []),
    ...(searchParams.salaryMin ? [{ key: "salaryMin", label: `£${searchParams.salaryMin}+ ${((searchParams as any).salaryPeriod || 'per_year').replace('_', ' ')}`, value: searchParams.salaryMin }] : []),
    ...((searchParams as any).salaryPeriod && (searchParams as any).salaryPeriod !== "per_year" ? [{ key: "salaryPeriod", label: `${(searchParams as any).salaryPeriod.replace('_', ' ')}`, value: (searchParams as any).salaryPeriod }] : []),
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        {/* Main Search Bar - Rightmove Style */}
        <div className="bg-white rounded-lg border-2 border-gray-300 p-2 mb-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Job Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 border-0 text-base font-medium placeholder:text-gray-500 focus-visible:ring-0"
              />
            </div>

            {/* Location Input */}
            <div className="lg:w-80 relative">
              <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Location (e.g., London, Manchester)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 border-0 text-base font-medium placeholder:text-gray-500 focus-visible:ring-0"
              />
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            >
              Search Jobs
            </Button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between mb-4">
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="fixed-term-contract">Fixed-term contract</SelectItem>
                      <SelectItem value="apprenticeship">Apprenticeship</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="zero-hours-contract">Zero-hours contract</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead Level</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary (£)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 30000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary (£)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 60000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
                </div>

                {/* Salary Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary Period</label>
                  <Select value={salaryFrequency} onValueChange={setSalaryFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_hour">Per Hour</SelectItem>
                      <SelectItem value="per_day">Per Day</SelectItem>
                      <SelectItem value="per_week">Per Week</SelectItem>
                      <SelectItem value="per_month">Per Month</SelectItem>
                      <SelectItem value="per_year">Per Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Active filters:</span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                {filter.label}
                <button
                  onClick={() => clearFilter(filter.key)}
                  className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}