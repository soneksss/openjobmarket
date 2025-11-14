import { redirect } from "next/navigation"

// Employer is the new name for company dashboard
export default function EmployerDashboard() {
  redirect("/dashboard/company")
}
