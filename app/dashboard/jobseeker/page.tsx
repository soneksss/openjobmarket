import { redirect } from "next/navigation"

// Jobseeker is the new name for professional dashboard
export default function JobseekerDashboard() {
  redirect("/dashboard/professional")
}
