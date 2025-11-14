import { AnalyticsDebugDashboard } from "@/components/analytics-debug"
import { getAdminUser } from "@/lib/admin-auth"

export default async function AdminDebugPage() {
  const adminUser = await getAdminUser()

  return <AnalyticsDebugDashboard />
}