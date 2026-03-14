import { redirect } from "next/navigation"

// Legacy route — all tradesperson types now use /dashboard/company
export default function ProfessionalDashboardPage() {
  redirect("/dashboard/company")
}
