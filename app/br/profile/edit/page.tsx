import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import ProfileEditForm from "@/components/profile-edit-form"

export default async function ProfileEditPageBR() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/profile/edit")
  }

  // Get user data from users table
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  // Redirect homeowners to their specific profile page
  if (userData?.user_type === "homeowner") {
    redirect("/br/dashboard/homeowner/profile")
  }

  // Redirect contractors to their specific profile page
  if (userData?.user_type === "contractor") {
    redirect("/contractor/profile/edit")
  }

  // Redirect companies to their specific profile page
  if (userData?.user_type === "company") {
    redirect("/company/profile/edit")
  }

  // Get professional profile if user is a professional
  let professionalProfile = null
  if (userData?.user_type === "professional") {
    const { data } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).single()
    professionalProfile = data
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <ProfileEditForm user={user as any} userData={userData} professionalProfile={professionalProfile} />
      </div>
    </div>
  )
}
