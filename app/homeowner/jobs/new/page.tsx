import { redirect } from "next/navigation"

// Legacy route - redirect to unified job posting page
export default async function NewHomeownerJobPage() {
  redirect("/jobs/new")
}
