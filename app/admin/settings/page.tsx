import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminSettingsPanel } from "@/components/admin-settings-panel"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Platform Settings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Configure marketplace behaviour, pricing, and feature flags</p>
        </div>
        <AdminSettingsPanel />
      </div>
    </div>
  )
}
