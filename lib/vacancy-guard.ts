import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

/**
 * Reads the vacancy_system feature flag (feature_flags table) — the same switch
 * the database uses to allow vacancy applications, so the UI and DB agree.
 */
export async function isVacancyEnabled(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("is_vacancy_system_enabled")
  return data === true
}

/**
 * Call at the top of any page that is vacancy-only.
 * Redirects to the trade jobs map if the vacancy system is disabled.
 */
export async function requireVacancyEnabled(): Promise<void> {
  const enabled = await isVacancyEnabled()
  if (!enabled) redirect("/find-jobs")
}

/**
 * Call at the top of /app/jobs/[id]/page.tsx which serves both
 * trade jobs and vacancies. Redirects only when the specific job
 * is a vacancy (is_tradespeople_job = false) AND the feature is off.
 */
export async function requireVacancyEnabledForJob(jobId: string): Promise<void> {
  const supabase = await createClient()

  const [flagResult, jobResult] = await Promise.all([
    supabase.rpc("is_vacancy_system_enabled"),
    supabase
      .from("jobs")
      .select("is_tradespeople_job")
      .eq("id", jobId)
      .maybeSingle(),
  ])

  const enabled = flagResult.data === true
  const isVacancy = jobResult.data?.is_tradespeople_job === false

  if (!enabled && isVacancy) redirect("/find-jobs")
}
