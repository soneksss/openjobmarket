// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"


export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is an admin first
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (adminUser) {
    redirect("/admin/dashboard")
  }

  // Check user type and redirect to appropriate dashboard
  const { data: userData, error: userError } = await supabase.from("users").select("user_type").eq("id", user.id).single()

  if (!userData || userError) {
    // If user data is not found, clear auth and redirect to home
    console.log("[v0] User data not found for authenticated user, clearing auth")
    await supabase.auth.signOut()
    redirect("/")
  }

  if (userData.user_type === "professional") {
    redirect("/dashboard/professional")
  } else if (userData.user_type === "company") {
    redirect("/dashboard/company")
  } else {
    redirect("/onboarding")
  }
}
