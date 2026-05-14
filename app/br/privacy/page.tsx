"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function PrivacyPage() {
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
          {t('privacy.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('privacy.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('privacy.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('privacy.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introdução</h2>
            <p>
              OpenJobMarket ("nós", "nos" ou "nosso") está comprometido em proteger sua privacidade. Esta Política de Privacidade
              explica como coletamos, usamos, divulgamos e protegemos suas informações quando você usa nossa Plataforma.
            </p>
            <p className="mt-3">
              Estamos em conformidade com o Regulamento Geral de Proteção de Dados (GDPR) e outras leis aplicáveis de proteção de dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Informações que Coletamos</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Informações que Você Fornece</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informações da Conta:</strong> Nome, endereço de e-mail, senha, número de telefone</li>
              <li><strong>Informações do Perfil:</strong> Título profissional, biografia, habilidades, experiência, localização, fotos</li>
              <li><strong>CV/Currículo:</strong> Histórico de emprego, educação, qualificações</li>
              <li><strong>Informações da Empresa:</strong> Nome da empresa, detalhes de registro, endereço comercial</li>
              <li><strong>Informações de Pagamento:</strong> Endereço de cobrança, detalhes do cartão de pagamento (processados de forma segura por terceiros)</li>
              <li><strong>Comunicações:</strong> Mensagens enviadas através da Plataforma, consultas de suporte</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dados de Uso:</strong> Páginas visitadas, recursos usados, tempo gasto na Plataforma</li>
              <li><strong>Informações do Dispositivo:</strong> Endereço IP, tipo de navegador, sistema operacional, identificadores do dispositivo</li>
              <li><strong>Dados de Localização:</strong> Localização aproximada baseada no endereço IP (com seu consentimento)</li>
              <li><strong>Cookies e Rastreamento:</strong> Consulte nossa Política de Cookies para detalhes</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.3 Informações de Terceiros</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Perfis de redes sociais (se você conectar suas contas)</li>
              <li>Processadores de pagamento (confirmações de transações)</li>
              <li>Provedores de análise (estatísticas de uso agregadas)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Como Usamos Suas Informações</h2>
            <p>Usamos suas informações para os seguintes propósitos:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Serviços da Plataforma</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criar e gerenciar sua conta</li>
              <li>Facilitar anúncios de vagas e candidaturas</li>
              <li>Permitir comunicação entre usuários</li>
              <li>Processar pagamentos e assinaturas</li>
              <li>Fornecer suporte ao cliente</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Melhoria e Desenvolvimento</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analisar o uso da Plataforma para melhorar os serviços</li>
              <li>Desenvolver novos recursos e funcionalidades</li>
              <li>Realizar pesquisas e análises</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Comunicação</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Enviar notificações e atualizações de serviço</li>
              <li>Responder a consultas e solicitações de suporte</li>
              <li>Enviar comunicações de marketing (com seu consentimento)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Legal e Segurança</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cumprir obrigações legais</li>
              <li>Prevenir fraudes e abusos</li>
              <li>Proteger a segurança dos usuários</li>
              <li>Fazer cumprir nossos Termos e Condições</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Base Legal para Processamento (GDPR)</h2>
            <p>Processamos seus dados pessoais com base em:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contrato:</strong> Para fornecer serviços que você solicitou</li>
              <li><strong>Consentimento:</strong> Para comunicações de marketing e recursos opcionais</li>
              <li><strong>Interesses Legítimos:</strong> Para melhorar nossa Plataforma e prevenir fraudes</li>
              <li><strong>Obrigação Legal:</strong> Para cumprir com as leis aplicáveis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Compartilhamento de Suas Informações</h2>

            <h3 className="text-xl font-semibold mb-3">5.1 Com Outros Usuários</h3>
            <p>
              As informações do seu perfil são visíveis para outros usuários com base no tipo de conta e configurações de privacidade.
              Empresas podem visualizar perfis profissionais, e profissionais podem visualizar anúncios de vagas.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Com Provedores de Serviços</h3>
            <p>Compartilhamos dados com terceiros confiáveis que nos ajudam a operar a Plataforma:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provedores de hospedagem em nuvem (por exemplo, Supabase, Vercel)</li>
              <li>Processadores de pagamento (por exemplo, Stripe)</li>
              <li>Provedores de serviço de e-mail</li>
              <li>Provedores de análise</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Requisitos Legais</h3>
            <p>Podemos divulgar informações quando exigido por lei ou para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cumprir com processos legais</li>
              <li>Responder a solicitações governamentais</li>
              <li>Proteger nossos direitos e propriedade</li>
              <li>Prevenir fraudes ou atividades ilegais</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.4 Transferências Comerciais</h3>
            <p>
              Se o OpenJobMarket estiver envolvido em uma fusão, aquisição ou venda de ativos, suas informações podem ser
              transferidas como parte dessa transação.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.5 Não Vendemos Dados</h3>
            <p>
              Não vendemos suas informações pessoais a terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Retenção de Dados</h2>
            <p>
              Retemos seus dados pessoais pelo tempo necessário para fornecer nossos serviços e cumprir com obrigações
              legais:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contas ativas: Dados retidos enquanto a conta estiver ativa</li>
              <li>Contas excluídas: A maioria dos dados é excluída em 30 dias; alguns dados retidos para conformidade legal</li>
              <li>Registros de transações: Retidos por 7 anos para fins fiscais e contábeis</li>
              <li>Comunicações de suporte: Retidas por 3 anos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Seus Direitos (GDPR)</h2>
            <p>Se você está na UE/EEE, você tem os seguintes direitos:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Direito de Acesso:</strong> Solicitar uma cópia de seus dados pessoais</li>
              <li><strong>Direito de Retificação:</strong> Corrigir dados imprecisos ou incompletos</li>
              <li><strong>Direito ao Esquecimento:</strong> Solicitar a exclusão de seus dados ("direito de ser esquecido")</li>
              <li><strong>Direito de Restringir o Processamento:</strong> Limitar como usamos seus dados</li>
              <li><strong>Direito à Portabilidade de Dados:</strong> Receber seus dados em um formato portátil</li>
              <li><strong>Direito de Objeção:</strong> Objetar ao processamento com base em interesses legítimos</li>
              <li><strong>Direito de Retirar Consentimento:</strong> Retirar consentimento para processamento a qualquer momento</li>
              <li><strong>Direito de Apresentar Reclamação:</strong> Registrar uma reclamação junto à sua autoridade de proteção de dados</li>
            </ul>

            <p className="mt-4">
              Para exercer esses direitos, use nosso <a href="/br/contact" className="text-blue-600 hover:text-blue-700 underline">formulário de contato</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Segurança de Dados</h2>
            <p>Implementamos medidas de segurança para proteger suas informações:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito (SSL/TLS)</li>
              <li>Criptografia de dados sensíveis em repouso</li>
              <li>Avaliações de segurança regulares</li>
              <li>Controles de acesso e autenticação</li>
              <li>Treinamento de funcionários sobre proteção de dados</li>
            </ul>
            <p className="mt-3">
              No entanto, nenhum método de transmissão pela internet é 100% seguro. Não podemos garantir segurança
              absoluta de suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Transferências Internacionais de Dados</h2>
            <p>
              Suas informações podem ser transferidas e processadas em países fora do seu país de residência.
              Garantimos que medidas de proteção apropriadas estejam em vigor para tais transferências, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cláusulas Contratuais Padrão aprovadas pela Comissão Europeia</li>
              <li>Decisões de adequação para determinados países</li>
              <li>Frameworks certificados (por exemplo, EU-U.S. Data Privacy Framework)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Privacidade de Crianças</h2>
            <p>
              Nossa Plataforma não se destina a usuários menores de 16 anos. Não coletamos intencionalmente informações
              pessoais de crianças menores de 16 anos. Se descobrirmos que coletamos tais informações, iremos
              excluí-las prontamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Cookies e Rastreamento</h2>
            <p>
              Usamos cookies e tecnologias de rastreamento similares. Para informações detalhadas, consulte nossa
              <Link href={getLocalePath("/cookies")} className="text-blue-600 hover:underline"> Política de Cookies</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Alterações à Política de Privacidade</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas via
              e-mail ou notificação na Plataforma. A data "Última Atualização" no topo desta política indica quando
              ela foi revisada pela última vez.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Informações de Contato</h2>
            <p>
              Para questões relacionadas à privacidade ou para exercer seus direitos, entre em contato conosco:
            </p>
            <p className="mt-2">
              <strong>Encarregado de Proteção de Dados</strong><br />
              Use nosso <a href="/br/contact" className="text-blue-600 hover:text-blue-700 underline">formulário de contato</a>.<br />
              Endereço: OpenJobMarket, Londres, Reino Unido
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Sua Privacidade Importa:</strong> Estamos comprometidos com a transparência e proteção de suas informações
              pessoais. Se você tiver alguma preocupação sobre como tratamos seus dados, não hesite em
              entrar em contato conosco.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
