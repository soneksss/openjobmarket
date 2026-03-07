"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Briefcase,
  MapPin,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Users,
  Calendar,
  Trash2,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

interface CompanyProfile {
  id: string
  company_name: string
}

interface Job {
  id: string
  title: string
  job_type: string
  work_location: string
  location: string
  is_active: boolean
  applications_count: number
  views_count: number
  created_at: string
  salary_min?: number
  salary_max?: number
  recruitment_timeline: string
  price: number
  expires_at?: string
  expiration_status?: string
  days_until_expiration?: number
}

interface CompanyJobsManagerProps {
  profile: CompanyProfile
  jobs: Job[]
}

export default function CompanyJobsManager({ profile, jobs }: CompanyJobsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "expiring">("all")
  const [loading, setLoading] = useState<string | null>(null)
  const [extendingJob, setExtendingJob] = useState<Job | null>(null)
  const [newTimeline, setNewTimeline] = useState("")
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const getJobStatus = (job: Job) => {
    // Use the expiration data from the database view
    const expirationDate = job.expires_at ? new Date(job.expires_at) : new Date()
    const daysUntilExpiration = job.days_until_expiration || 0

    if (job.expiration_status === "expired") {
      return { status: "expired", daysUntilExpiration, expirationDate }
    } else if (job.expiration_status === "expiring_soon") {
      return { status: "expiring", daysUntilExpiration, expirationDate }
    } else {
      return { status: "active", daysUntilExpiration, expirationDate }
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase())
    const jobStatus = getJobStatus(job)

    let matchesStatus = true
    if (statusFilter === "active") {
      matchesStatus = job.is_active && jobStatus.status === "active"
    } else if (statusFilter === "expired") {
      matchesStatus = jobStatus.status === "expired"
    } else if (statusFilter === "expiring") {
      matchesStatus = job.is_active && jobStatus.status === "expiring"
    }

    return matchesSearch && matchesStatus
  })

  const jobCounts = {
    all: jobs.length,
    active: jobs.filter((job) => job.is_active && getJobStatus(job).status === "active").length,
    expiring: jobs.filter((job) => job.is_active && getJobStatus(job).status === "expiring").length,
    expired: jobs.filter((job) => getJobStatus(job).status === "expired").length,
  }

  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    setLoading(jobId)
    try {
      const { error } = await supabase.from("jobs").update({ is_active: !currentStatus }).eq("id", jobId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error updating job status:", error)
      alert("Failed to update job status")
    } finally {
      setLoading(null)
    }
  }

  const deleteJob = async (jobId: string) => {
    setLoading(jobId)
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting job:", error)
      alert("Failed to delete job")
    } finally {
      setLoading(null)
    }
  }

  const handleJobToggle = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId])
    } else {
      setSelectedJobs(selectedJobs.filter((id) => id !== jobId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(filteredJobs.map((job) => job.id))
    } else {
      setSelectedJobs([])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedJobs.length === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedJobs.length} job${selectedJobs.length === 1 ? "" : "s"}? This action cannot be undone.`
    )

    if (!confirmed) return

    setBulkDeleting(true)
    try {
      const { error } = await supabase.from("jobs").delete().in("id", selectedJobs)

      if (error) throw error

      setSelectedJobs([])
      router.refresh()
    } catch (error) {
      console.error("Error deleting jobs:", error)
      alert("Failed to delete jobs")
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleExtendJob = async (jobToExtend: Job, timeline: string) => {
    if (!jobToExtend || !timeline) {
      console.error("[JOB-EXTEND] Missing job or timeline")
      return
    }

    setLoading(jobToExtend.id)
    let updateSucceeded = false

    try {
      // Map display timeline to database format
      const timelineMap: { [key: string]: string } = {
        "3 days": "3_days",
        "7 days": "7_days",
        "2 weeks": "14_days",
        "3 weeks": "21_days",
        "4 weeks": "28_days",
      }

      const priceMap: { [key: string]: number } = {
        "3 days": 0,
        "7 days": 0,
        "2 weeks": 0,
        "3 weeks": 0,
        "4 weeks": 0,
      }

      const dbTimeline = timelineMap[timeline]
      const newPrice = priceMap[timeline]

      if (!dbTimeline) {
        throw new Error("Invalid timeline selected")
      }

      console.log("[JOB-EXTEND] Extending job:", {
        jobId: jobToExtend.id,
        timeline: dbTimeline,
        price: newPrice,
      })

      // Use the RPC function for extending jobs
      const { data, error } = await supabase.rpc("extend_job", {
        job_id_param: jobToExtend.id,
        new_timeline: dbTimeline,
        new_price: newPrice,
      })

      if (error) {
        // Handle specific Supabase errors
        if (error.message?.includes("fetch") || error.message?.includes("JWT")) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw error
      }

      if (!data) {
        throw new Error("Failed to extend job - job may not exist or you don't have permission")
      }

      updateSucceeded = true
      console.log("[JOB-EXTEND] Job extended successfully")

      // Clear dialog state
      setExtendingJob(null)
      setNewTimeline("")

      // Protected refresh with fallback
      setTimeout(() => {
        try {
          router.refresh()
        } catch (refreshError) {
          console.error("[JOB-EXTEND] Router refresh failed:", refreshError)
          window.location.reload()
        }
      }, 1000)
    } catch (error: any) {
      console.error("[JOB-EXTEND] Error extending job:", error)

      // Provide specific error messages
      let errorMessage = "Failed to extend job. Please try again."

      if (error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("DISCONNECTED")) {
        errorMessage = "Network connection issue. Please check your connection and try again."
      } else if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        errorMessage = "Session expired. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      alert(errorMessage)

      // Reset dialog state on error
      setExtendingJob(null)
      setNewTimeline("")
    } finally {
      // Smart loading state management
      if (!updateSucceeded) {
        setLoading(null)
      } else {
        setTimeout(() => {
          setLoading(null)
        }, 3000)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified"
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const getStatusBadge = (job: Job) => {
    const jobStatus = getJobStatus(job)

    if (jobStatus.status === "expired") {
      return <Badge variant="destructive">Expired {Math.abs(jobStatus.daysUntilExpiration)} days ago</Badge>
    } else if (jobStatus.status === "expiring") {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Expires in {jobStatus.daysUntilExpiration} days
        </Badge>
      )
    } else if (job.is_active) {
      return <Badge variant="default">Active - expires {formatDate(jobStatus.expirationDate.toISOString())}</Badge>
    } else {
      return <Badge variant="secondary">Inactive</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 md:bg-gray-50">
      <div className="container mx-auto px-4 py-3">
        <div className="mb-3">
          <h1 className="text-xl md:text-2xl font-bold mb-0.5 text-white md:text-gray-900">Manage Jobs</h1>
          <p className="text-xs md:text-sm text-slate-400 md:text-gray-600">View and manage your job postings</p>
        </div>

        {/* Bulk Actions Bar */}
        {selectedJobs.length > 0 && (
          <Card className="mb-3 bg-emerald-900/30 md:bg-blue-50 border-emerald-700/50 md:border-blue-200">
            <CardContent className="p-2 md:p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedJobs.length === filteredJobs.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-medium text-sm text-white md:text-gray-900">
                    {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedJobs([])}
                    className="text-xs h-8"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="text-xs h-8"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {bulkDeleting ? "..." : "Delete"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-3 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white md:text-gray-900">Filters</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-visible"
                  checked={filteredJobs.length > 0 && selectedJobs.length === filteredJobs.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-visible" className="text-xs md:text-sm font-medium cursor-pointer text-slate-300 md:text-gray-700">
                  Select all
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 md:text-gray-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 md:placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                  className="text-xs h-7 px-2"
                >
                  All ({jobCounts.all})
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  onClick={() => setStatusFilter("active")}
                  size="sm"
                  className="text-xs h-7 px-2"
                >
                  Active ({jobCounts.active})
                </Button>
                <Button
                  variant={statusFilter === "expiring" ? "default" : "outline"}
                  onClick={() => setStatusFilter("expiring")}
                  size="sm"
                  className={`text-xs h-7 px-2 ${jobCounts.expiring > 0 ? "bg-orange-100 text-orange-800 hover:bg-orange-200" : ""}`}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expiring ({jobCounts.expiring})
                </Button>
                <Button
                  variant={statusFilter === "expired" ? "default" : "outline"}
                  onClick={() => setStatusFilter("expired")}
                  size="sm"
                  className={`text-xs h-7 px-2 ${jobCounts.expired > 0 ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}`}
                >
                  Expired ({jobCounts.expired})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <Card className="bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
            <CardContent className="text-center py-12">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-slate-500 md:text-gray-400 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-white md:text-gray-900">
                {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
              </h3>
              <p className="text-slate-400 md:text-gray-600 mb-4">
                {jobs.length === 0
                  ? "Start by posting your first job to attract talented candidates."
                  : "Try adjusting your search terms or filters."}
              </p>
              {jobs.length === 0 && (
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/jobs/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Job
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map((job) => {
              const jobStatus = getJobStatus(job)
              return (
                <Card key={job.id} className={`bg-slate-800 md:bg-white border-slate-700 md:border-gray-200 ${jobStatus.status === "expired" ? "opacity-75" : ""}`}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start space-x-3 md:space-x-4">
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedJobs.includes(job.id)}
                          onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Title and status - stack on mobile */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-semibold truncate text-white md:text-gray-900">{job.title}</h3>
                          <div className="flex items-center gap-1">
                            {getStatusBadge(job)}
                            {jobStatus.status === "expiring" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                          </div>
                        </div>

                        {/* Job details - wrap on mobile */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-400 md:text-gray-600 mb-3">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="truncate max-w-[120px] md:max-w-none">{job.location}</span>
                          </span>
                          <Badge variant="secondary" className="text-xs bg-slate-700 md:bg-gray-100 text-slate-300 md:text-gray-700">{job.job_type}</Badge>
                          <Badge variant="secondary" className="text-xs bg-slate-700 md:bg-gray-100 text-slate-300 md:text-gray-700">{job.work_location}</Badge>
                          <span className="hidden sm:inline">{formatSalary(job.salary_min, job.salary_max)}</span>
                        </div>

                        {/* Stats - simplified on mobile */}
                        <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-slate-400 md:text-gray-600 mb-3 md:mb-0">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            {job.applications_count}
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            {job.views_count}
                          </span>
                          <span className="hidden md:flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Posted {formatDate(job.created_at)}
                          </span>
                          {jobStatus.status !== "expired" && (
                            <span className="hidden md:flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Expires {formatDate(jobStatus.expirationDate.toISOString())}
                            </span>
                          )}
                        </div>

                        {/* Action buttons - wrap on all screens */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-700 md:border-gray-200 md:border-0 md:pt-0 md:mt-0">
                          <Button size="sm" variant="outline" asChild className="text-xs md:text-sm h-8 border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700 hover:bg-slate-700 md:hover:bg-gray-100">
                            <Link href={`/jobs/${job.id}/applications`}>
                              <Users className="h-3 w-3 mr-1 md:hidden" />
                              <span className="hidden md:inline">Applications ({job.applications_count})</span>
                              <span className="md:hidden">{job.applications_count}</span>
                            </Link>
                          </Button>

                          {(jobStatus.status === "expired" || jobStatus.status === "expiring") && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-50 text-green-700 hover:bg-green-100 text-xs md:text-sm h-8"
                                >
                                  <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                  {jobStatus.status === "expired" ? "Reactivate" : "Extend"}
                                </Button>
                              </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Extend Job Posting</DialogTitle>
                                <DialogDescription>
                                  Select a new recruitment timeline to extend "{job.title}" and make it visible on the
                                  map again. Job extensions are free.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">New Timeline</label>
                                  <Select
                                    value={extendingJob?.id === job.id ? newTimeline : ""}
                                    onValueChange={(value) => {
                                      setExtendingJob(job)
                                      setNewTimeline(value)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select timeline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="3 days">3 days</SelectItem>
                                      <SelectItem value="7 days">7 days</SelectItem>
                                      <SelectItem value="2 weeks">2 weeks</SelectItem>
                                      <SelectItem value="3 weeks">3 weeks</SelectItem>
                                      <SelectItem value="4 weeks">4 weeks</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setExtendingJob(null)
                                    setNewTimeline("")
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleExtendJob(job, newTimeline)}
                                  disabled={!newTimeline || loading === job.id || extendingJob?.id !== job.id}
                                >
                                  {loading === job.id ? "Extending..." : "Extend Job"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/jobs/${job.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Job
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/jobs/${job.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Job
                                </Link>
                              </DropdownMenuItem>
                              {jobStatus.status !== "expired" && (
                                <DropdownMenuItem
                                  onClick={() => toggleJobStatus(job.id, job.is_active)}
                                  disabled={loading === job.id}
                                >
                                  {job.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Job
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Job</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{job.title}"? This action cannot be undone and will
                                      remove all associated applications.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteJob(job.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Job
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
