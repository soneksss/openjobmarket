"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Cookie } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function CookiesPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'

  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href={getLocalePath("/")}
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('cookies.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Cookie className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('cookies.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('cookies.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('cookies.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. O Que São Cookies?</h2>
            <p>
              Cookies são pequenos arquivos de texto que são colocados em seu dispositivo quando você visita um site. Eles são amplamente
              usados para fazer sites funcionarem de forma mais eficiente e fornecer informações aos proprietários de sites.
            </p>
            <p className="mt-3">
              Esta Política de Cookies explica como o OpenJobMarket usa cookies e tecnologias de rastreamento similares em nossa
              Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Tipos de Cookies que Usamos</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Cookies Estritamente Necessários</h3>
            <p>
              Estes cookies são essenciais para o funcionamento adequado da Plataforma. Eles habilitam funcionalidades principais
              como segurança, gerenciamento de rede e acessibilidade.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Exemplos:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Cookies de autenticação (mantêm você conectado)</li>
                <li>Cookies de segurança (protegem contra fraudes)</li>
                <li>Cookies de sessão (mantêm o estado da sua sessão)</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duração:</strong> Sessão ou até 1 ano</p>
              <p className="text-sm"><strong>Pode ser desabilitado:</strong> Não (necessário para operação da Plataforma)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Cookies de Desempenho e Análise</h3>
            <p>
              Estes cookies coletam informações sobre como você usa nossa Plataforma, como quais páginas você visita
              com mais frequência. Isso nos ajuda a melhorar o desempenho da Plataforma e a experiência do usuário.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Exemplos:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Google Analytics (estatísticas de uso agregadas)</li>
                <li>Rastreamento de desempenho de carregamento de página</li>
                <li>Rastreamento e depuração de erros</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duração:</strong> Até 2 anos</p>
              <p className="text-sm"><strong>Pode ser desabilitado:</strong> Sim (através de preferências de cookies)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Cookies de Funcionalidade</h3>
            <p>
              Estes cookies permitem que a Plataforma lembre as escolhas que você faz (como sua preferência de idioma,
              localização ou configurações de exibição) e forneça recursos aprimorados e personalizados.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Exemplos:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Cookies de preferência de idioma</li>
                <li>Cookies de preferência de localização</li>
                <li>Preferências de modo escuro/tema</li>
                <li>Preferências de filtro de pesquisa</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duração:</strong> Até 1 ano</p>
              <p className="text-sm"><strong>Pode ser desabilitado:</strong> Sim (pode afetar a experiência do usuário)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Cookies de Segmentação/Publicidade</h3>
            <p>
              Estes cookies são usados para entregar anúncios mais relevantes para você e seus interesses. Eles também
              podem ser usados para limitar o número de vezes que você vê um anúncio e medir a eficácia
              de campanhas publicitárias.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Exemplos:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Cookies de redes de publicidade</li>
                <li>Cookies de remarketing</li>
                <li>Pixels de publicidade de redes sociais</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duração:</strong> Até 2 anos</p>
              <p className="text-sm"><strong>Pode ser desabilitado:</strong> Sim (através de preferências de cookies)</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Cookies de Terceiros</h2>
            <p>
              Usamos serviços de provedores terceirizados confiáveis que podem definir cookies em seu dispositivo. Estes
              incluem:
            </p>

            <div className="space-y-4 mt-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Google Analytics</p>
                <p className="text-sm mt-1">
                  Usado para analisar o uso da Plataforma e melhorar os serviços.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Stripe (Processamento de Pagamentos)</p>
                <p className="text-sm mt-1">
                  Usado para processamento seguro de pagamentos.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Supabase (Serviços de Backend)</p>
                <p className="text-sm mt-1">
                  Usado para autenticação e armazenamento de dados.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Vercel (Hospedagem)</p>
                <p className="text-sm mt-1">
                  Usado para hospedagem e desempenho da Plataforma.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Como Usamos Cookies</h2>
            <p>Usamos cookies para os seguintes propósitos:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Autenticação:</strong> Para mantê-lo conectado e verificar sua identidade</li>
              <li><strong>Segurança:</strong> Para detectar e prevenir atividades fraudulentas</li>
              <li><strong>Preferências:</strong> Para lembrar suas configurações e preferências</li>
              <li><strong>Análise:</strong> Para entender como os usuários interagem com nossa Plataforma</li>
              <li><strong>Desempenho:</strong> Para melhorar a velocidade e funcionalidade da Plataforma</li>
              <li><strong>Marketing:</strong> Para entregar anúncios relevantes (com seu consentimento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Gerenciando Preferências de Cookies</h2>

            <h3 className="text-xl font-semibold mb-3">5.1 Banner de Consentimento de Cookies</h3>
            <p>
              Quando você visitar o OpenJobMarket pela primeira vez, verá um banner de consentimento de cookies. Você pode aceitar todos os cookies,
              rejeitar cookies não essenciais ou personalizar suas preferências.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Configurações do Navegador</h3>
            <p>
              A maioria dos navegadores web permite controlar cookies através de suas configurações. Você pode:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Excluir todos os cookies do seu navegador</li>
              <li>Bloquear todos os cookies</li>
              <li>Bloquear apenas cookies de terceiros</li>
              <li>Ser notificado quando um site define um cookie</li>
            </ul>

            <p className="mt-4">
              <strong>Instruções específicas por navegador:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Google Chrome</li>
              <li>Mozilla Firefox</li>
              <li>Safari</li>
              <li>Microsoft Edge</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Ferramentas de Desativação</h3>
            <p>Você também pode usar ferramentas de desativação disponíveis nos navegadores e configurações de privacidade do seu dispositivo.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Impacto de Desabilitar Cookies</h2>
            <p>
              Se você desabilitar cookies, alguns recursos da Plataforma podem não funcionar corretamente:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Você pode precisar fazer login cada vez que visitar</li>
              <li>Suas preferências não serão salvas</li>
              <li>Alguns recursos podem não estar disponíveis</li>
              <li>A Plataforma pode carregar mais lentamente</li>
            </ul>
            <p className="mt-4">
              <strong>Nota:</strong> Cookies estritamente necessários não podem ser desabilitados, pois são essenciais para
              a operação da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Outras Tecnologias de Rastreamento</h2>
            <p>Além de cookies, podemos usar:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.1 Web Beacons (Pixels)</h3>
            <p>
              Pequenas imagens gráficas incorporadas em páginas web ou e-mails para rastrear o comportamento do usuário e medir a
              eficácia de campanhas.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Armazenamento Local</h3>
            <p>
              Mecanismo de armazenamento do navegador que permite que sites armazenem dados localmente em seu dispositivo para melhor
              desempenho e funcionalidade offline.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.3 Armazenamento de Sessão</h3>
            <p>
              Armazenamento temporário que é limpo quando você fecha a aba do navegador, usado para dados de curto prazo
              como entradas de formulário.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Atualizações da Política de Cookies</h2>
            <p>
              Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças em nossas práticas ou por
              razões legais, operacionais ou regulatórias. Notificaremos você sobre mudanças significativas atualizando
              a data "Última Atualização" no topo desta política.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Seus Direitos</h2>
            <p>
              De acordo com o GDPR e outras leis de proteção de dados, você tem direitos relacionados a cookies e rastreamento:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Direito de ser informado sobre o uso de cookies</li>
              <li>Direito de aceitar ou rejeitar cookies não essenciais</li>
              <li>Direito de alterar as preferências de cookies a qualquer momento</li>
              <li>Direito de retirar o consentimento para cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Entre em Contato Conosco</h2>
            <p>
              Se você tiver dúvidas sobre nosso uso de cookies ou esta Política de Cookies, entre em contato conosco:
            </p>
            <p className="mt-2">
              Use nosso <a href="/br/contact" className="text-blue-600 hover:text-blue-700 underline">formulário de contato</a>.<br />
              Endereço: OpenJobMarket, Londres, Reino Unido
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Preferências de Cookies:</strong> Você pode alterar suas preferências de cookies a qualquer momento através
              das configurações do seu navegador ou entrando em contato conosco diretamente. Respeitamos suas escolhas de privacidade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
