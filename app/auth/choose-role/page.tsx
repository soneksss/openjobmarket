import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ChooseRoleClient from "./client"

export default async function ChooseRolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Already has a proper role — go directly to the right dashboard
  const { data: row } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle()

  if (row?.user_type === "homeowner") redirect("/dashboard/homeowner")
  if (row?.user_type === "company")   redirect("/dashboard/company")
  if (row?.user_type === "admin")     redirect("/admin/dashboard")

  // Unknown / legacy 'professional' type → show the two-button picker
  return <ChooseRoleClient />
}
