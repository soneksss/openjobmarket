import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import SecuritySettings from "@/components/security-settings"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/br/account/settings"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar às Configurações da Conta
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Lock className="h-8 w-8 mr-3 text-primary" />
            Configurações de Segurança
          </CardTitle>
          <p className="text-muted-foreground">Gerencie sua senha e segurança da conta</p>
        </CardHeader>
        <CardContent>
          <SecuritySettings userEmail={user.email || ""} />
        </CardContent>
      </Card>
    </div>
  )
}
