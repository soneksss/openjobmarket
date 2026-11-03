import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import VacancyPostingForm from "@/components/vacancy-posting-form"
import { requireVacancyEnabled } from "@/lib/vacancy-guard"

export default async function NewVacancyPage() {
  await requireVacancyEnabled()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?returnUrl=${encodeURIComponent("/jobs/vacancy/new")}`)
  }

  // Get company profile — only business accounts post vacancies.
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/find-vacancies")
  }

  return (
    <div className="min-h-screen bg-[#030a08]">
      <VacancyPostingForm companyProfile={profile} />
    </div>
  )
}
