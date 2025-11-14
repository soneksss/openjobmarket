import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import ProfileEditForm from "@/components/profile-edit-form"

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get user data from users table
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  // Get professional profile if user is a professional
  let professionalProfile = null
  if (userData?.user_type === "professional") {
    const { data } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).single()
    professionalProfile = data
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <ProfileEditForm user={user as any} userData={userData} professionalProfile={professionalProfile} />
    </div>
  )
}
