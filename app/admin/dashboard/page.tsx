import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminOpsCenter } from "@/components/admin-ops-center"

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")
  return <AdminOpsCenter />
}
