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
    // Signed in but no users row (the signup trigger failed) — the role
    // picker creates it.
    console.log("[DASHBOARD] User data not found for authenticated user, redirecting to choose-role")
    redirect("/auth/choose-role")
  }

  if (userData.user_type === "company") {
    redirect("/dashboard/company")
  } else if (userData.user_type === "homeowner") {
    redirect("/dashboard/homeowner")
  } else {
    // Legacy or unset type — default to homeowner dashboard
    redirect("/dashboard/homeowner")
  }
}
