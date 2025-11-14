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
import { Loader2, Briefcase, Calendar } from "lucide-react"

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

    const supabase = createClient()

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      // Calculate expiry date (7 days from now)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)

      const jobData = {
        homeowner_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget_min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
        budget_max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
        location: formData.location,
        urgency: formData.urgency,
        status: "open",
        is_active: true,
        expires_at: expiryDate.toISOString(),
      }

      const { error: insertError } = await supabase
        .from("homeowner_jobs")
        .insert(jobData)

      if (insertError) {
        console.error("Insert error:", insertError)
        throw insertError
      }

      // Redirect to homeowner dashboard
      router.push("/dashboard/homeowner")
      router.refresh()
    } catch (err: any) {
      console.error("Job posting error:", err)
      setError(err.message || "Failed to post job")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Briefcase className="w-8 h-8 mr-3 text-blue-600" />
            Post a Task
          </h1>
          <p className="text-gray-600">
            Describe the job you need help with and local contractors will be able to see it
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
          <Calendar className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Auto-expires in 7 days</p>
            <p>Your task will automatically expire after 7 days to keep listings fresh. You can post again anytime.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fix leaking kitchen tap"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task in detail... What needs to be done? Any specific requirements?"
              rows={5}
              required
            />
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., London, UK"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budgetMin">Min Budget (£)</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="budgetMax">Max Budget (£)</Label>
              <Input
                id="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                placeholder="150"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="urgency">Urgency *</Label>
            <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible - No rush</SelectItem>
                <SelectItem value="normal">Normal - Within a week</SelectItem>
                <SelectItem value="urgent">Urgent - ASAP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1" size="lg">
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
    </div>
  )
}
