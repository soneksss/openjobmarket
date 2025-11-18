import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/professional-office-buildings-cityscape.jpg')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-blue-800/60"></div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <LoginForm />
      </div>
    </div>
  )
}
