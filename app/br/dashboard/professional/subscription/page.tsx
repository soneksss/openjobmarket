"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Crown,
  Users,
  Check,
  Calendar,
  CreditCard,
  AlertCircle,
  Star,
  Eye,
  Zap,
  Target,
  Receipt,
  Download,
  Briefcase
} from "lucide-react"
import { createClient } from "@/lib/client"

interface SubscriptionPlan {
  id: string
  name: string
  user_type: 'company' | 'professional'
  price: number
  duration_days: number
  job_limit: number | null
  contact_limit: number | null
  application_limit: number | null
  features: Record<string, any>
  active: boolean
}

interface UserSubscription {
  has_subscription: boolean
  subscription_id?: string
  plan_name?: string
  plan_type?: string
  price?: number
  start_date?: string
  end_date?: string
  jobs_used?: number
  jobs_limit?: number | null
  contacts_used?: number
  contacts_limit?: number | null
  applications_used?: number
  application_limit?: number | null
  applications_remaining?: number | null
  applications_reset_date?: string
  unlimited_applications?: boolean
  features?: Record<string, any>
  days_remaining?: number
}

interface BillingHistory {
  id: string
  created_at: string
  plan_name: string
  amount: number
  currency: string
  status: 'completed' | 'pending' | 'failed'
  payment_method: string
  invoice_url?: string
}

// Conversion rate: £1 = R$7
const GBP_TO_BRL = 7

const convertToBRL = (gbpPrice: number): number => {
  return Math.round(gbpPrice * GBP_TO_BRL)
}

export default function ProfessionalSubscriptionPageBR() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminSettings, setAdminSettings] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      // Load admin settings to check if subscriptions are enabled
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("subscriptions_enabled")
        .limit(1)
        .single()

      setAdminSettings(settings)

      // Load available plans for professionals
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("user_type", "professional")
        .eq("active", true)
        .order("price", { ascending: true })

      if (plansError) throw plansError
      setPlans(plansData || [])

      // Load user's current subscription
      const { data: subscriptionData, error: subError } = await supabase
        .rpc("get_user_active_subscription", { user_id_param: user.id })

      if (subError) throw subError
      setUserSubscription(subscriptionData)

      // Load billing history
      const { data: historyData, error: historyError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          created_at,
          start_date,
          end_date,
          status,
          payment_data,
          subscription_plans!inner(name, price)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (historyError) {
        console.warn("Erro ao carregar histórico:", historyError)
      } else {
        const transformedHistory: BillingHistory[] = (historyData || []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          plan_name: item.subscription_plans?.name || "Plano Desconhecido",
          amount: item.subscription_plans?.price || item.payment_data?.amount || 0,
          currency: item.payment_data?.currency || "BRL",
          status: item.status === 'active' || item.status === 'expired' ? 'completed' : item.status,
          payment_method: item.payment_data?.payment_gateway || "Cartão de Crédito",
          invoice_url: item.payment_data?.invoice_url
        }))
        setBillingHistory(transformedHistory)
      }

    } catch (err) {
      console.error("Erro ao carregar dados de assinatura:", err)
      setError("Falha ao carregar informações de assinatura")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseSubscription = async (planId: string) => {
    setPurchasing(planId)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error("Plano não encontrado")

      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000))

      const { error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          payment_data: {
            type: 'simulated_payment',
            amount: convertToBRL(plan.price),
            currency: 'BRL',
            timestamp: new Date().toISOString(),
            payment_gateway: 'simulated'
          }
        })

      if (insertError) throw insertError

      await loadData()

    } catch (err) {
      console.error("Erro ao comprar assinatura:", err)
      setError("Falha ao comprar assinatura. Por favor, tente novamente.")
    } finally {
      setPurchasing(null)
    }
  }

  const formatDuration = (days: number) => {
    if (days === 1) return "1 dia"
    if (days === 7) return "1 semana"
    if (days === 30) return "1 mês"
    if (days < 7) return `${days} dias`
    if (days < 30) return `${Math.floor(days / 7)} semanas`
    return `${Math.floor(days / 30)} meses`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-muted-foreground animate-spin" />
          <div>
            <h1 className="text-3xl font-bold">Assinatura</h1>
            <p className="text-muted-foreground">Carregando detalhes da assinatura...</p>
          </div>
        </div>
      </div>
    )
  }

  // If subscriptions are disabled, show free message
  if (!adminSettings?.subscriptions_enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Assinatura</h1>
            <p className="text-muted-foreground">Gerenciar sua assinatura profissional</p>
          </div>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Star className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Todos os Recursos Disponíveis Gratuitamente</h3>
                  <p className="text-green-600 mt-1">
                    As assinaturas foram desabilitadas pelo administrador. Você tem acesso total a todos os recursos profissionais sem custo.
                  </p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium mb-2">Recursos incluídos:</p>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3" />
                      <span>Alternância "Procurando Ativamente"</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3" />
                      <span>Nome do perfil em negrito</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3" />
                      <span>Indicador verde de visibilidade</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3" />
                      <span>Classificação prioritária nas buscas</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Crown className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Assinatura</h1>
          <p className="text-muted-foreground">Aprimore seu perfil profissional</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Status */}
      {userSubscription?.has_subscription ? (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <Check className="h-5 w-5" />
              <span>Assinatura Premium Ativa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-green-800">Plano {userSubscription.plan_name}</h3>
                <p className="text-green-600">R${convertToBRL(userSubscription.price || 0)}/{formatDuration(30)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">Expira em</p>
                <p className="font-medium text-green-800">
                  {userSubscription.end_date && formatDate(userSubscription.end_date)}
                </p>
                <p className="text-xs text-green-600">
                  {userSubscription.days_remaining} dias restantes
                </p>
              </div>
            </div>

            {/* Application Usage Tracking */}
            {userSubscription.application_limit !== null && userSubscription.application_limit !== undefined && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-green-800 mb-3">Candidaturas a Vagas:</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Candidaturas Este Mês</span>
                    <span className="font-medium">
                      {userSubscription.applications_used || 0} / {userSubscription.application_limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (userSubscription.applications_used || 0) >= userSubscription.application_limit
                          ? 'bg-red-600'
                          : (userSubscription.applications_used || 0) / userSubscription.application_limit > 0.7
                          ? 'bg-amber-500'
                          : 'bg-green-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          ((userSubscription.applications_used || 0) / userSubscription.application_limit) * 100,
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {userSubscription.applications_remaining || 0} candidaturas restantes
                    </span>
                    {userSubscription.applications_reset_date && (
                      <span>
                        Reinicia em{' '}
                        {new Date(userSubscription.applications_reset_date).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Features */}
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-medium text-green-800">Recursos Ativos:</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {userSubscription.features?.actively_looking && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">Alternância "Procurando Ativamente"</span>
                  </div>
                )}
                {userSubscription.features?.bold_profile && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Nome do perfil em negrito</span>
                  </div>
                )}
                {userSubscription.features?.green_indicator && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Indicador verde de visibilidade</span>
                  </div>
                )}
                {userSubscription.features?.priority_search && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">Classificação prioritária nas buscas</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800">Perfil Básico</h3>
                <p className="text-amber-600">
                  Atualize para Premium para desbloquear visibilidade aprimorada e recursos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Planos Profissionais</h2>
        <div className="grid gap-6 max-w-md">
          {plans.map((plan) => {
            const priceInBRL = convertToBRL(plan.price)
            const isCurrentPlan = userSubscription?.plan_name === plan.name

            return (
              <Card
                key={plan.id}
                className={`relative ${isCurrentPlan ? 'border-green-500 bg-green-50' : 'border-green-200'}`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-600">Plano Atual</Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-xl flex items-center justify-center space-x-2">
                    <Crown className="h-5 w-5 text-green-600" />
                    <span>{plan.name}</span>
                  </CardTitle>
                  <div className="text-3xl font-bold text-green-600">
                    R${priceInBRL}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{formatDuration(plan.duration_days)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Destaque-se e seja notado por empregadores
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Duração de {formatDuration(plan.duration_days)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {plan.application_limit
                          ? `${plan.application_limit} candidaturas por mês`
                          : 'Candidaturas ilimitadas'}
                      </span>
                    </div>

                    {plan.features?.actively_looking && (
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Visibilidade da alternância "Procurando Ativamente"</span>
                      </div>
                    )}

                    {plan.features?.bold_profile && (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Nome do perfil em negrito nos resultados</span>
                      </div>
                    )}

                    {plan.features?.green_indicator && (
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Indicador verde de visibilidade</span>
                      </div>
                    )}

                    {plan.features?.priority_search && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Classificação mais alta nos resultados</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-700">
                      <strong>Benefícios Premium:</strong> Aumente sua visibilidade para empresas e seja notado mais rapidamente com recursos aprimorados de perfil.
                    </p>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handlePurchaseSubscription(plan.id)}
                    disabled={purchasing === plan.id || isCurrentPlan || !adminSettings?.subscriptions_enabled}
                    variant={isCurrentPlan ? "outline" : "default"}
                  >
                    {purchasing === plan.id ? (
                      "Processando..."
                    ) : isCurrentPlan ? (
                      "Plano Atual"
                    ) : !adminSettings?.subscriptions_enabled ? (
                      "Desabilitado"
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Atualizar por R${priceInBRL}
                      </>
                    )}
                  </Button>

                  {!adminSettings?.subscriptions_enabled && !isCurrentPlan && (
                    <p className="text-xs text-center text-muted-foreground">
                      As assinaturas foram desabilitadas pelo administrador. A plataforma está gratuita.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {plans.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum Plano Disponível</h3>
            <p className="text-muted-foreground">
              Nenhum plano de assinatura está disponível atualmente para profissionais.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Recursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
              <div>Recurso</div>
              <div className="text-center">Básico (Grátis)</div>
              <div className="text-center">Premium</div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Visibilidade do perfil</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Receber candidaturas de emprego</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Alternância "Procurando Ativamente"</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Nome do perfil em negrito</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Classificação prioritária nas buscas</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Indicador verde de visibilidade</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Receipt className="h-6 w-6 mr-2" />
          Histórico de Pagamentos
        </h2>
        <Card>
          <CardContent className="p-0">
            {billingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Data</th>
                      <th className="text-left p-4 font-medium">Plano</th>
                      <th className="text-left p-4 font-medium">Valor</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Pagamento</th>
                      <th className="text-left p-4 font-medium">Nota Fiscal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="p-4">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{item.plan_name}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {item.currency === 'BRL' || item.currency === 'GBP' ? 'R$' : item.currency}
                            {item.currency === 'GBP' ? convertToBRL(item.amount) : item.amount}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={item.status === 'completed' ? 'default' :
                                   item.status === 'pending' ? 'secondary' : 'destructive'}
                            className={
                              item.status === 'completed' ? 'bg-green-600' :
                              item.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                            }
                          >
                            {item.status === 'completed' ? 'Pago' :
                             item.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground capitalize">
                          {item.payment_method.replace('_', ' ')}
                        </td>
                        <td className="p-4">
                          {item.invoice_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const receiptText = `Recibo para ${item.plan_name}\nData: ${new Date(item.created_at).toLocaleDateString('pt-BR')}\nValor: R$${item.currency === 'GBP' ? convertToBRL(item.amount) : item.amount}\nStatus: ${item.status}`
                                const blob = new Blob([receiptText], { type: 'text/plain' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `recibo-${item.id}.txt`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Recibo
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sem histórico de pagamentos</h3>
                <p className="text-muted-foreground">
                  {userSubscription?.has_subscription
                    ? "Seu histórico de pagamentos aparecerá aqui após o primeiro pagamento."
                    : "Assine Premium para ver seu histórico de pagamentos aqui."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
