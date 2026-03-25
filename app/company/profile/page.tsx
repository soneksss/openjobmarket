// /company/profile — redirect to the edit page (no index view needed)
export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"

export default function CompanyProfilePage() {
  redirect("/company/profile/edit")
}
