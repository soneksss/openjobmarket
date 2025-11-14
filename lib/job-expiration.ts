import { createClient } from "@/lib/client"

export interface ExpiringJob {
  job_id: string
  title: string
  company_name: string
  user_id: string
  expires_at: string
  days_until_expiration: number
}

export interface ExpirationResult {
  expired_count: number
  expiring_jobs: ExpiringJob[]
  processed_at: string
}

/**
 * Process job expirations - expire jobs and get expiring jobs
 * This should be called periodically (e.g., via cron job or serverless function)
 */
export async function processJobExpirations(): Promise<ExpirationResult | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc("process_job_expirations")

    if (error) {
      console.error("Error processing job expirations:", error)
      return null
    }

    return data as ExpirationResult
  } catch (error) {
    console.error("Failed to process job expirations:", error)
    return null
  }
}

/**
 * Get jobs that are expiring soon for a specific company
 */
export async function getExpiringJobsForCompany(companyId: string, daysAhead = 3) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("job_status_view")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .in("expiration_status", ["expiring_soon"])
      .lte("days_until_expiration", daysAhead)
      .order("expires_at", { ascending: true })

    if (error) {
      console.error("Error getting expiring jobs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Failed to get expiring jobs:", error)
    return []
  }
}

/**
 * Extend a job with a new timeline and pricing
 */
export async function extendJob(jobId: string, newTimeline: string, newPrice = 0) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc("extend_job", {
      job_id_param: jobId,
      new_timeline: newTimeline,
      new_price: newPrice,
    })

    if (error) {
      console.error("Error extending job:", error)
      return false
    }

    return data as boolean
  } catch (error) {
    console.error("Failed to extend job:", error)
    return false
  }
}

/**
 * Get job status with expiration information
 */
export async function getJobWithExpirationStatus(jobId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.from("job_status_view").select("*").eq("id", jobId).single()

    if (error) {
      console.error("Error getting job status:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Failed to get job status:", error)
    return null
  }
}
