import { redirect } from "next/navigation"

export default async function AdminRegisterPage() {
  // Admin registration is disabled - redirect to login
  redirect("/admin/login?error=registration_disabled")
}