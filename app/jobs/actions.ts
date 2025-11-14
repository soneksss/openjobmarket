"use server"

import { createClient } from "@/lib/server"
import { revalidatePath } from "next/cache"

interface JobData {
  company_id: string
  title: string
  description: string
  requirements: string[]
  responsibilities: string[]
  job_type: string
  experience_level: string
  work_location: string
  location: string
  latitude: number | null
  longitude: number | null
  salary_min: number | null
  salary_max: number | null
  salary_period: string | null
  skills_required: string[]
  benefits: string[]
  is_active: boolean
}

export async function createJob(jobData: JobData) {
  const supabase = await createClient()

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Verify user owns the company
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("id", jobData.company_id)
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    return { error: "Unauthorized: You don't have permission to create jobs for this company" }
  }

  // Create the job
  const { data, error } = await supabase.from("jobs").insert(jobData).select().single()

  if (error) {
    console.error("Error creating job:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard/company")
  return { data }
}

export async function updateJob(jobId: string, jobData: JobData) {
  const supabase = await createClient()

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Verify user owns the company and the job
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("id", jobData.company_id)
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    return { error: "Unauthorized: You don't have permission to update jobs for this company" }
  }

  // Verify the job belongs to this company
  const { data: job } = await supabase.from("jobs").select("company_id").eq("id", jobId).single()

  if (!job || job.company_id !== jobData.company_id) {
    return { error: "Job not found or unauthorized" }
  }

  // Update the job
  const { data, error } = await supabase.from("jobs").update(jobData).eq("id", jobId).select().single()

  if (error) {
    console.error("Error updating job:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard/company")
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/edit`)
  return { data }
}
