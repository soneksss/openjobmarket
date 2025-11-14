import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import CompanySetupForm from "@/components/company-setup-form"

export default async function CompanySetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    redirect("/auth/login")
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).single()

  if (existingProfile) {
    redirect("/dashboard/company")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Company Profile</h1>
          <p className="text-gray-600 mb-8">
            Complete your company profile to start posting jobs and attracting top talent.
          </p>
          <CompanySetupForm userId={user.id} />
        </div>
      </div>
    </div>
  )
}
