"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, Briefcase, Calendar, ArrowLeft, Zap, Clock } from "lucide-react"
import { UrgentJobSearch } from "@/components/urgent-job-search"

interface HomeownerJobFormProps {
  userId: string
  profile: any
}

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting & Decorating",
  "Gardening",
  "Cleaning",
  "General Handyman",
  "Roofing",
  "Flooring",
  "Other"
]

export function HomeownerJobForm({ userId, profile }: HomeownerJobFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrgentSearch, setShowUrgentSearch] = useState(false)
  const [postedJobId, setPostedJobId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budgetMin: "",
    budgetMax: "",
    urgency: "normal",
    location: profile.location || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Timeout protection - automatically reset loading after 30 seconds
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setError("Request timed out. Please check your connection and try again.")
    }, 30000)

    const supabase = createClient()

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.location) {
      clearTimeout(timeoutId)
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      // Calculate expiry date (7 days from now)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)

      // Determine if this is an urgent job (ASAP or Today)
      const isUrgentJob = formData.urgency === "asap" || formData.urgency === "today"
      const defaultRadius = formData.urgency === "asap" ? 5 : 10 // Smaller radius for ASAP

      // Insert into 'jobs' table (consistent with homeowner dashboard)
      // Use profile.id (homeowner_profile.id) for the foreign key
      const jobData: Record<string, any> = {
        homeowner_id: profile.id,
        title: formData.title,
        description: formData.description,
        short_description: formData.description.substring(0, 200), // Auto-generate short description
        location: formData.location,
        // Store approx coords only — exact address revealed after job confirmation
        latitude:         profile.latitude_approx  ?? profile.latitude  ?? null,
        longitude:        profile.longitude_approx ?? profile.longitude ?? null,
        latitude_approx:  profile.latitude_approx  ?? null,
        longitude_approx: profile.longitude_approx ?? null,
        budget_min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
        budget_max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
        // Mark as tradespeople job (homeowner looking for services)
        is_tradespeople_job: true,
        is_active: true,
        status: "POSTED",
        expires_at: expiryDate.toISOString(),
      }

      // Always set urgency_type so dispatch routes can guard on it
      jobData.urgency_type = formData.urgency || "flexible"
      if (isUrgentJob) {
        jobData.search_radius_miles = defaultRadius
        jobData.search_state = "active_search"
      }

      let insertedJob: { id: string } | null = null
      let insertError: any = null

      // First attempt with all fields into 'jobs' table
      const result1 = await supabase
        .from("jobs")
        .insert(jobData)
        .select("id")
        .single()

      if (result1.error) {
        // If error mentions unknown column, retry without urgent-specific fields
        if (result1.error.message?.includes("column") || result1.error.code === "42703") {
          const { urgency_type, search_radius_miles, search_state, ...baseJobData } = jobData
          const result2 = await supabase
            .from("jobs")
            .insert(baseJobData)
            .select("id")
            .single()
          insertedJob = result2.data
          insertError = result2.error
        } else {
          insertError = result1.error
        }
      } else {
        insertedJob = result1.data
      }

      if (insertError) {
        clearTimeout(timeoutId)
        throw insertError
      }

      clearTimeout(timeoutId)

      // Reset loading before redirect/showing urgent search
      setIsLoading(false)

      // If urgent job (ASAP/Today), dispatch push notifications then show the urgent search overlay
      if (isUrgentJob && insertedJob?.id) {
        // Fire-and-forget: notify nearby tradespeople
        fetch(`/api/jobs/${insertedJob.id}/dispatch-urgent`, { method: "POST" }).catch(() => {})
        setPostedJobId(insertedJob.id)
        setShowUrgentSearch(true)
        return
      }

      // Flexible job: notify matching tradespeople in background, then redirect
      if (formData.urgency === "flexible" && insertedJob?.id) {
        fetch(`/api/jobs/${insertedJob.id}/dispatch-flexible`, { method: "POST" }).catch(() => {})
      }

      // Redirect to job details page
      // This shows "Waiting for applications" status

      if (insertedJob?.id) {
        try {
          router.push(`/dashboard/homeowner/jobs/${insertedJob.id}`)
        } catch (pushError) {
          // Fallback to direct navigation
          window.location.href = `/dashboard/homeowner/jobs/${insertedJob.id}`
        }
      } else {
        // Fallback if no job ID (shouldn't happen)
        router.push("/dashboard/homeowner")
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      setError(err.message || "Failed to post job")
      setIsLoading(false)
    } finally {
      // Ensure timeout is always cleared
      clearTimeout(timeoutId)
      // Always ensure loading state is reset
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 max-w-2xl pb-24 md:pb-12">
      {/* Mobile Header */}
      <div className="flex items-center gap-3 mb-6 md:hidden">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-emerald-400" />
          Post a Task
        </h1>
      </div>

      <Card className="p-4 md:p-8 bg-slate-800 md:bg-white border-slate-700/50 md:border-gray-200">
        {/* Desktop Header */}
        <div className="mb-6 md:mb-8 hidden md:block">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Briefcase className="w-8 h-8 mr-3 text-blue-600" />
            Post a Task
          </h1>
          <p className="text-gray-600">
            Describe the job you need help with and local contractors will be able to see it
          </p>
        </div>

        {/* Mobile description */}
        <p className="text-sm text-slate-400 mb-4 md:hidden">
          Describe the job you need help with and local contractors will be able to see it
        </p>

        <div className="bg-emerald-500/20 md:bg-blue-50 border border-emerald-500/30 md:border-blue-200 rounded-xl p-4 mb-6 flex items-start">
          <Calendar className="w-5 h-5 text-emerald-400 md:text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-200 md:text-blue-800">
            <p className="font-medium mb-1 text-emerald-300 md:text-blue-900">Auto-expires in 7 days</p>
            <p>Your task will automatically expire after 7 days to keep listings fresh. You can post again anytime.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div>
            <Label htmlFor="title" className="text-white md:text-gray-900">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fix leaking kitchen tap"
              required
              className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 focus:ring-emerald-500 md:focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-white md:text-gray-900">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
                {CATEGORIES.map((category) => (
                  <SelectItem
                    key={category}
                    value={category}
                    className="text-slate-200 md:text-gray-900 hover:bg-slate-700 md:hover:bg-gray-100 focus:bg-slate-700 md:focus:bg-gray-100"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-white md:text-gray-900">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task in detail... What needs to be done? Any specific requirements?"
              rows={5}
              required
              className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 focus:ring-emerald-500 md:focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="location" className="text-white md:text-gray-900">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., London, UK"
              required
              className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 focus:ring-emerald-500 md:focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="budgetMin" className="text-white md:text-gray-900">Min Budget (£)</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                placeholder="50"
                className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 focus:ring-emerald-500 md:focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="budgetMax" className="text-white md:text-gray-900">Max Budget (£)</Label>
              <Input
                id="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                placeholder="150"
                className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 focus:ring-emerald-500 md:focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="urgency" className="text-white md:text-gray-900">When do you need this done? *</Label>
            <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
              <SelectTrigger className="mt-1.5 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
                <SelectItem
                  value="asap"
                  className="text-slate-200 md:text-gray-900 hover:bg-slate-700 md:hover:bg-gray-100 focus:bg-slate-700 md:focus:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-red-400" />
                    ASAP - Within 10 minutes
                  </span>
                </SelectItem>
                <SelectItem
                  value="today"
                  className="text-slate-200 md:text-gray-900 hover:bg-slate-700 md:hover:bg-gray-100 focus:bg-slate-700 md:focus:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Today - Within 1-3 hours
                  </span>
                </SelectItem>
                <SelectItem
                  value="normal"
                  className="text-slate-200 md:text-gray-900 hover:bg-slate-700 md:hover:bg-gray-100 focus:bg-slate-700 md:focus:bg-gray-100"
                >
                  This week - Within a few days
                </SelectItem>
                <SelectItem
                  value="flexible"
                  className="text-slate-200 md:text-gray-900 hover:bg-slate-700 md:hover:bg-gray-100 focus:bg-slate-700 md:focus:bg-gray-100"
                >
                  Flexible - 1-7 days
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.urgency === "asap" && (
              <p className="mt-2 text-sm text-red-400 md:text-red-600">
                <Zap className="w-3 h-3 inline mr-1" />
                Emergency mode: First tradesperson to respond can accept immediately. Auto-expands to "Today" after 10 minutes if no response.
              </p>
            )}
            {formData.urgency === "today" && (
              <p className="mt-2 text-sm text-amber-400 md:text-amber-600">
                <Clock className="w-3 h-3 inline mr-1" />
                Same-day mode: Get multiple quotes within 1-3 hours and choose the best fit.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 md:bg-red-50 border border-red-500/30 md:border-red-200 text-red-400 md:text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 md:space-x-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700 hover:bg-slate-700 md:hover:bg-gray-100 hover:text-white md:hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-emerald-600 md:bg-blue-600 hover:bg-emerald-700 md:hover:bg-blue-700 text-white"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Task"
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Urgent Job Search Overlay */}
      {showUrgentSearch && postedJobId && (
        <UrgentJobSearch
          jobId={postedJobId}
          jobTitle={formData.title}
          urgencyType={formData.urgency as "asap" | "today"}
          initialRadius={formData.urgency === "asap" ? 5 : 10}
          location={formData.location}
          onClose={() => {
            setShowUrgentSearch(false)
            router.push("/dashboard/homeowner")
          }}
          onConvertToStandard={async () => {
            // Update the job to remove urgent search flags
            const supabase = createClient()
            await supabase
              .from("jobs")
              .update({
                urgency_type: null,
                search_state: null,
              })
              .eq("id", postedJobId)
            setShowUrgentSearch(false)
            router.push("/dashboard/homeowner")
          }}
        />
      )}
    </div>
  )
}
