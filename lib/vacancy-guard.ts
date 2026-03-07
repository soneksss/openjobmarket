import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

/**
 * Reads the vacancies_jobseekers_enabled flag from admin_settings.
 * Defaults to true if the setting doesn't exist (safe open default).
 */
async function isVacancyEnabled(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_public_admin_settings")
  return data?.vacancies_jobseekers_enabled ?? true
}

/**
 * Call at the top of any page that is vacancy-only.
 * Redirects to /dashboard if the vacancy system is disabled.
 */
export async function requireVacancyEnabled(): Promise<void> {
  const enabled = await isVacancyEnabled()
  if (!enabled) redirect("/dashboard")
}

/**
 * Call at the top of /app/jobs/[id]/page.tsx which serves both
 * trade jobs and vacancies. Redirects only when the specific job
 * is a vacancy (is_tradespeople_job = false) AND the feature is off.
 */
export async function requireVacancyEnabledForJob(jobId: string): Promise<void> {
  const supabase = await createClient()

  const [settingsResult, jobResult] = await Promise.all([
    supabase.rpc("get_public_admin_settings"),
    supabase
      .from("jobs")
      .select("is_tradespeople_job")
      .eq("id", jobId)
      .maybeSingle(),
  ])

  const enabled = settingsResult.data?.vacancies_jobseekers_enabled ?? true
  const isVacancy = jobResult.data?.is_tradespeople_job === false

  if (!enabled && isVacancy) redirect("/dashboard")
}
