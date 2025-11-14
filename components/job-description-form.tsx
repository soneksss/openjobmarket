"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  country: string
  location_type: string
  location: string
  description?: string
}

interface CompanyProfile {
  id: string
  company_name: string
}

interface JobDescriptionFormProps {
  job: Job
  companyProfile: CompanyProfile
}

export default function JobDescriptionForm({ job, companyProfile }: JobDescriptionFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState(job.description || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)

      if (error) throw error

      // Redirect back to company dashboard
      router.push("/dashboard/company")
    } catch (error) {
      console.error("Error updating job:", error)
      alert("Failed to update job description. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">{job.title}</h1>
          <p className="text-sm text-muted-foreground">
            {job.location_type} • {job.location || "Remote"}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a detailed description of the role, responsibilities, and requirements.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity exciting..."
                  rows={12}
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/company">Save as Draft</Link>
                </Button>
                <Button type="submit" disabled={loading || !description.trim()}>
                  {loading ? "Saving..." : "Complete Job Posting"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
