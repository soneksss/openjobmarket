"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = searchParams.get('locale')
  const isPtBr = locale === 'pt-BR'

  const [email, setEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    // Try to get the user's email from session
    const checkEmail = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user?.email) {
        setEmail(session.user.email)
      } else {
        // Try to get from localStorage (saved during signup)
        const savedEmail = localStorage.getItem('signup_email')
        if (savedEmail) {
          setEmail(savedEmail)
        }
      }
    }

    checkEmail()
  }, [])

  const handleResendEmail = async () => {
    if (!email) {
      setResendError(isPtBr
        ? "Não foi possível encontrar seu e-mail. Por favor, tente se cadastrar novamente."
        : "Could not find your email. Please try signing up again."
      )
      return
    }

    setResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        console.error('Resend error:', error)
        setResendError(error.message)
      } else {
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } catch (err: any) {
      console.error('Resend exception:', err)
      setResendError(err.message || (isPtBr
        ? "Erro ao reenviar o e-mail"
        : "Failed to resend email")
      )
    } finally {
      setResending(false)
    }
  }

  const t = {
    title: isPtBr ? "Obrigado por se cadastrar!" : "Thank you for signing up!",
    description: isPtBr
      ? "Enviamos um e-mail de confirmação para sua caixa de entrada."
      : "We've sent a confirmation email to your inbox.",
    checkEmail: isPtBr ? "Verifique seu e-mail" : "Check your email",
    emailSentTo: isPtBr ? "Enviamos um e-mail de confirmação para:" : "We sent a confirmation email to:",
    instructions: isPtBr
      ? "Por favor, clique no link de confirmação no e-mail para ativar sua conta."
      : "Please click the confirmation link in the email to activate your account.",
    checkSpam: isPtBr
      ? "Não viu o e-mail? Verifique sua pasta de spam ou lixo eletrônico."
      : "Can't find the email? Check your spam or junk folder.",
    resendButton: isPtBr ? "Reenviar E-mail de Confirmação" : "Resend Confirmation Email",
    resending: isPtBr ? "Reenviando..." : "Resending...",
    resendSuccess: isPtBr
      ? "E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada."
      : "Confirmation email resent successfully! Check your inbox.",
    backToLogin: isPtBr ? "Voltar para Login" : "Back to Login",
    troubleTitle: isPtBr ? "Problemas?" : "Having trouble?",
    troubleText: isPtBr
      ? "Se você não receber o e-mail em alguns minutos, tente reenviar ou entre em contato com o suporte."
      : "If you don't receive the email within a few minutes, try resending or contact support.",
    emailSettings: isPtBr ? "Configurações de E-mail" : "Email Settings",
    emailSettingsText: isPtBr
      ? "Certifique-se de que nosso e-mail não está bloqueado pelo seu provedor. Adicione noreply@mail.app.supabase.co à sua lista de remetentes seguros."
      : "Make sure our email isn't blocked by your provider. Add noreply@mail.app.supabase.co to your safe senders list.",
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <p className="font-medium mb-1">{t.checkEmail}</p>
              {email && (
                <p className="text-sm">
                  {t.emailSentTo} <span className="font-semibold">{email}</span>
                </p>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">1.</span>
              <span>{t.instructions}</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">2.</span>
              <span>{t.checkSpam}</span>
            </p>
          </div>

          {resendSuccess && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {t.resendSuccess}
              </AlertDescription>
            </Alert>
          )}

          {resendError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {resendError}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleResendEmail}
            disabled={resending || !email}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.resending}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t.resendButton}
              </>
            )}
          </Button>

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              <p className="font-medium mb-1">{t.emailSettings}</p>
              <p className="text-xs">{t.emailSettingsText}</p>
            </AlertDescription>
          </Alert>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t.troubleTitle}</p>
            <p className="text-xs text-gray-600">{t.troubleText}</p>
          </div>

          <div className="text-center">
            <Link
              href={isPtBr ? '/auth/login?locale=pt-BR' : '/auth/login'}
              className="text-sm text-blue-600 hover:underline"
            >
              {t.backToLogin}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
