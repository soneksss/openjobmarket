import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { SeededTradesClient } from "./seeded-trades-client"

export const dynamic = "force-dynamic"

export default async function SeededTradesPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Seeded Trades</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Import businesses from CSV, view listings, and export claim links for email campaigns
        </p>
      </div>
      <SeededTradesClient />
    </div>
  )
}
