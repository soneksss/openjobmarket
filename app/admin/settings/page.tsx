import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminSettingsPanel } from "@/components/admin-settings-panel"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Platform Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Configure marketplace behaviour and feature flags</p>
      </div>
      <AdminSettingsPanel />
    </div>
  )
}
