// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { requirePermission } from "@/lib/admin-auth"
import AdminUsersClient from "./admin-users-client"

export default async function AdminUsersPage() {
  // Require user management permissions
  const adminUser = await requirePermission('can_manage_users')

  return <AdminUsersClient adminUser={adminUser} />
}
