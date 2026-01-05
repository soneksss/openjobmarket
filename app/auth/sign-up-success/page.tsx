"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MailCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function SignUpSuccessPage() {
  const searchParams = useSearchParams()
  const locale = searchParams?.get('locale')
  const isPortuguese = locale === 'pt-BR'

  const loginUrl = isPortuguese ? "/auth/login?locale=pt-BR" : "/auth/login"

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/professional-office-buildings-cityscape.jpg')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-blue-800/60"></div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <MailCheck className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {isPortuguese ? "Obrigado por se cadastrar!" : "Thank you for signing up!"}
              </CardTitle>
              <CardDescription className="text-base">
                {isPortuguese ? "Verifique seu e-mail para confirmar" : "Check your email to confirm"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {isPortuguese
                  ? "Enviamos um link de confirmação para seu e-mail. Por favor, clique no link para verificar sua conta antes de fazer login."
                  : "We've sent a confirmation link to your email. Please click the link to verify your account before signing in."}
              </p>

              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {isPortuguese ? "Não recebeu o e-mail?" : "Didn't receive the email?"}
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>{isPortuguese ? "Verifique sua pasta de spam" : "Check your spam folder"}</li>
                  <li>{isPortuguese ? "Verifique se o endereço de e-mail está correto" : "Make sure the email address is correct"}</li>
                  <li>{isPortuguese ? "Aguarde alguns minutos - pode demorar um pouco" : "Wait a few minutes - it may take a while"}</li>
                </ul>
              </div>

              <div className="pt-4 space-y-2">
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href={loginUrl}>
                    {isPortuguese ? "Ir para Login" : "Go to Login"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={isPortuguese ? "/br" : "/"}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {isPortuguese ? "Voltar para Home" : "Back to Home"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
