import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { MarketplaceAnalytics } from "@/components/marketplace-analytics"

export default async function AdminAnalyticsPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <MarketplaceAnalytics />
    </div>
  )
}
