import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import VacancyPostingForm from "@/components/vacancy-posting-form"

export default async function NewVacancyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VacancyPostingForm companyProfile={profile} />
    </div>
  )
}
