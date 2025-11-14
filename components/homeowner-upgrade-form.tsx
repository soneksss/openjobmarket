"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Briefcase } from "lucide-react"

interface HomeownerUpgradeFormProps {
  userId: string
  homeownerProfile: any
}

export function HomeownerUpgradeForm({ userId, homeownerProfile }: HomeownerUpgradeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    jobTitle: "",
    skills: "",
    desiredSalary: "",
    cvUrl: "",
    bio: homeownerProfile?.bio || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Validation
    if (!formData.jobTitle || !formData.skills) {
      setError("Please fill in job title and skills")
      setIsLoading(false)
      return
    }

    try {
      // Parse skills from comma-separated string
      const skillsArray = formData.skills
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Call the database function to switch homeowner to jobseeker
      const { data: switchData, error: switchError } = await supabase
        .rpc("switch_homeowner_to_jobseeker", {
          user_id_param: userId
        })

      if (switchError) {
        console.error("Switch error:", switchError)
        throw new Error("Failed to upgrade account")
      }

      // Create professional profile with additional job-seeking info
      const professionalData = {
        user_id: userId,
        first_name: homeownerProfile.first_name,
        last_name: homeownerProfile.last_name,
        phone: homeownerProfile.phone,
        location: homeownerProfile.location,
        bio: formData.bio || homeownerProfile.bio,
        job_title: formData.jobTitle,
        skills: skillsArray,
        desired_salary: formData.desiredSalary ? parseInt(formData.desiredSalary) : null,
        cv_url: formData.cvUrl || null,
        on_market: true,
      }

      const { error: profileError } = await supabase
        .from("professional_profiles")
        .insert(professionalData)

      if (profileError) {
        console.error("Profile error:", profileError)
        throw profileError
      }

      // Redirect to professional dashboard
      router.push("/dashboard/professional")
      router.refresh()
    } catch (err: any) {
      console.error("Upgrade error:", err)
      setError(err.message || "Failed to upgrade account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upgrade to Jobseeker
          </h1>
          <p className="text-gray-600">
            Add your professional details to start looking for work
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            What you'll get:
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Access to job listings and applications</li>
            <li>• Professional profile visible to employers</li>
            <li>• Keep your homeowner account for posting tasks</li>
            <li>• Switch between both dashboards anytime</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="jobTitle">Job Title / Role *</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              placeholder="e.g., Software Developer, Accountant, Electrician"
              required
            />
          </div>

          <div>
            <Label htmlFor="skills">Skills *</Label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="e.g., JavaScript, React, Node.js (comma separated)"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Separate multiple skills with commas</p>
          </div>

          <div>
            <Label htmlFor="desiredSalary">Desired Salary (£/year)</Label>
            <Input
              id="desiredSalary"
              type="number"
              value={formData.desiredSalary}
              onChange={(e) => setFormData({ ...formData, desiredSalary: e.target.value })}
              placeholder="e.g., 35000"
            />
          </div>

          <div>
            <Label htmlFor="cvUrl">CV/Resume URL</Label>
            <Input
              id="cvUrl"
              type="url"
              value={formData.cvUrl}
              onChange={(e) => setFormData({ ...formData, cvUrl: e.target.value })}
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                  setFormData({ ...formData, cvUrl: `https://${value}` })
                }
              }}
              placeholder="https://drive.google.com/... or https://yourwebsite.com/cv.pdf"
            />
            <p className="text-sm text-gray-500 mt-1">Link to your CV on Google Drive, Dropbox, or your website</p>
          </div>

          <div>
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell employers about your experience and what you're looking for..."
              rows={4}
            />
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
                  Upgrading...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Upgrade to Jobseeker
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
