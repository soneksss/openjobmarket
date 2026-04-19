import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminUserManagement } from "@/components/admin-user-management"
import { Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="h-full flex flex-col overflow-hidden text-white">
      <div className="flex flex-col flex-1 min-h-0">

        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">User Management</h1>
            <p className="text-xs text-zinc-500">Homeowners and tradespeople on the marketplace</p>
          </div>
        </div>

        <AdminUserManagement />
      </div>
    </div>
  )
}
