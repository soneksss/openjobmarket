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

  // Route to correct profile edit page based on role
  if (userData?.user_type === "homeowner") {
    redirect("/dashboard/homeowner/profile")
  }

  // company (tradesperson) — and all legacy types
  redirect("/company/profile/edit")
}
