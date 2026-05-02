import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminUserManagement } from "@/components/admin-user-management"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return <AdminUserManagement />
}
