import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (userData?.user_type !== "admin") {
    redirect("/")
  }

  // Redirect to admin dashboard
  redirect("/admin/dashboard")
}
