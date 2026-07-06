import { redirect } from "next/navigation"
import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; access_token?: string; refresh_token?: string; error?: string; session_active?: string }>
}) {
  const params = await searchParams
  const { code, access_token, refresh_token, error, session_active } = params

  // If there's an error in the URL, show it
  if (error) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/professional-office-buildings-cityscape.jpg')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-blue-800/60"></div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-6 py-4 rounded-md max-w-md">
            <h2 className="text-lg font-semibold mb-2">Reset Link Invalid</h2>
            <p className="text-sm">This password reset link is invalid or has expired. Please request a new one.</p>
          </div>
        </div>
      </div>
    )
  }

  // Need a PKCE code, legacy tokens, OR an active recovery session
  // (session_active=1 is set by /auth/callback after it exchanges a recovery code)
  if (!code && (!access_token || !refresh_token) && session_active !== "1") {
    redirect("/auth/forgot-password")
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/professional-office-buildings-cityscape.jpg')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-blue-800/60"></div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <ResetPasswordForm
          code={code}
          accessToken={access_token}
          refreshToken={refresh_token}
        />
      </div>
    </div>
  )
}
