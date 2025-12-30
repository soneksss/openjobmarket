import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Bell, User, Lock, CreditCard, ArrowLeft, Mail, Eye } from "lucide-react"
import NotificationPreferences from "@/components/notification-preferences"
import EmailPreferences from "@/components/email-preferences"
import ProfileVisibilitySettings from "@/components/profile-visibility-settings"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/br/dashboard"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            Configurações da Conta
          </CardTitle>
          <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Atualize suas informações pessoais e detalhes do perfil</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/br/dashboard">Ir ao Perfil</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Gerencie sua senha e configurações de segurança</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/br/account/security">Gerenciar Segurança</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Faturamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Gerencie sua assinatura e métodos de pagamento</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/br/billing">Ver Faturamento</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Section */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <Bell className="h-6 w-6 mr-3 text-primary" />
          <h2 className="text-2xl font-bold">Preferências de Notificação</h2>
        </div>
        <NotificationPreferences userId={user.id} />
      </div>

      {/* Email Preferences Section */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <Mail className="h-6 w-6 mr-3 text-primary" />
          <h2 className="text-2xl font-bold">Preferências de E-mail</h2>
        </div>
        <EmailPreferences userId={user.id} />
      </div>

      {/* Profile Visibility Settings Section */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <Eye className="h-6 w-6 mr-3 text-primary" />
          <h2 className="text-2xl font-bold">Visibilidade do Perfil</h2>
        </div>
        <ProfileVisibilitySettings userId={user.id} />
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Configurações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Centro de Privacidade</h3>
              <p className="text-sm text-muted-foreground">Gerencie suas configurações de privacidade e dados</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/br/privacy-centre">Gerenciar</Link>
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Idioma e Região</h3>
              <p className="text-sm text-muted-foreground">Defina seu idioma e região preferidos</p>
            </div>
            <Button variant="outline" disabled>
              Em Breve
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
