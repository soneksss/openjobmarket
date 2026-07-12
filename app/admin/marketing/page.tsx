import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminMarketingPanel } from "@/components/admin-marketing-panel"

export const dynamic = "force-dynamic"

export default async function AdminMarketingPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Marketing</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Promo codes and the referral programme</p>
      </div>
      <AdminMarketingPanel />
    </div>
  )
}
