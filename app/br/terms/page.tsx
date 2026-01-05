"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function TermsPage() {
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
          {t('terms.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('terms.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('terms.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('terms.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar o OpenJobMarket ("a Plataforma"), você concorda em ficar vinculado a estes Termos e Condições.
              Se você não concorda com estes termos, por favor não use nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Definições</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>"Plataforma"</strong> refere-se ao site OpenJobMarket e todos os seus serviços</li>
              <li><strong>"Usuário"</strong> refere-se a qualquer pessoa acessando ou usando a Plataforma</li>
              <li><strong>"Profissional"</strong> refere-se a indivíduos oferecendo seus serviços</li>
              <li><strong>"Empresa"</strong> refere-se a empresas buscando contratar profissionais</li>
              <li><strong>"Proprietário"</strong> refere-se a indivíduos publicando tarefas ou trabalhos</li>
              <li><strong>"Contratante"</strong> refere-se a profissionais autônomos ou prestadores de serviços</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Contas de Usuário</h2>
            <h3 className="text-xl font-semibold mb-3">3.1 Registro</h3>
            <p>
              Você deve criar uma conta para acessar certos recursos. Você concorda em fornecer informações precisas, atuais
              e completas durante o registro e atualizar tais informações conforme necessário.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Segurança da Conta</h3>
            <p>
              Você é responsável por manter a confidencialidade das suas credenciais de conta e por todas
              as atividades que ocorrem sob sua conta.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Tipos de Conta</h3>
            <p>
              A Plataforma oferece diferentes tipos de conta (Profissional, Empresa, Proprietário, Contratante).
              Você deve selecionar o tipo de conta apropriado e cumprir com todos os requisitos específicos para esse tipo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Uso dos Serviços</h2>
            <h3 className="text-xl font-semibold mb-3">4.1 Uso Permitido</h3>
            <p>Você concorda em usar a Plataforma apenas para fins legais e de acordo com estes Termos.</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Atividades Proibidas</h3>
            <p>Você não pode:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Publicar informações falsas, enganosas ou fraudulentas</li>
              <li>Se passar por qualquer pessoa ou entidade</li>
              <li>Assediar, abusar ou prejudicar outros usuários</li>
              <li>Usar sistemas automatizados para acessar a Plataforma sem autorização</li>
              <li>Tentar obter acesso não autorizado a qualquer parte da Plataforma</li>
              <li>Interferir ou interromper a operação da Plataforma</li>
              <li>Violar qualquer lei ou regulamento aplicável</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Anúncios de Vagas e Candidaturas</h2>
            <h3 className="text-xl font-semibold mb-3">5.1 Anúncios de Vagas</h3>
            <p>
              Empresas e Proprietários podem publicar vagas ou tarefas. Todos os anúncios de vagas devem ser precisos, legais
              e estar em conformidade com as leis trabalhistas aplicáveis.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Candidaturas</h3>
            <p>
              Profissionais e Contratantes podem se candidatar a vagas. As candidaturas devem conter informações precisas
              sobre qualificações e experiência.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Papel da Plataforma</h3>
            <p>
              OpenJobMarket atua como um mercado conectando usuários. Não somos um empregador, agência de emprego
              ou parte de qualquer relação de emprego formada através da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Pagamentos e Assinaturas</h2>
            <h3 className="text-xl font-semibold mb-3">6.1 Planos de Assinatura</h3>
            <p>
              Certos recursos requerem uma assinatura paga. As taxas de assinatura não são reembolsáveis exceto conforme
              exigido por lei.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Processamento de Pagamento</h3>
            <p>
              Todos os pagamentos são processados de forma segura através de processadores de pagamento terceirizados. Não armazenamos
              suas informações completas de cartão de pagamento.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.3 Renovação Automática</h3>
            <p>
              As assinaturas são renovadas automaticamente a menos que sejam canceladas antes da data de renovação. Você pode cancelar
              sua assinatura a qualquer momento através das configurações da sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Conteúdo e Propriedade Intelectual</h2>
            <h3 className="text-xl font-semibold mb-3">7.1 Conteúdo do Usuário</h3>
            <p>
              Você mantém a propriedade do conteúdo que publica. Ao publicar conteúdo, você nos concede uma licença para usar,
              exibir e distribuir esse conteúdo na Plataforma.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Conteúdo da Plataforma</h3>
            <p>
              Todo o conteúdo da Plataforma, incluindo texto, gráficos, logotipos e software, é propriedade do OpenJobMarket
              ou seus licenciadores e protegido por leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Privacidade e Proteção de Dados</h2>
            <p>
              Seu uso da Plataforma também é regido por nossa Política de Privacidade. Estamos em conformidade com o GDPR e outros
              regulamentos aplicáveis de proteção de dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Isenções de Responsabilidade e Limitações de Responsabilidade</h2>
            <h3 className="text-xl font-semibold mb-3">9.1 Sem Garantias</h3>
            <p>
              A Plataforma é fornecida "como está" sem garantias de qualquer tipo. Não garantimos que a
              Plataforma será livre de erros, segura ou ininterrupta.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.2 Limitação de Responsabilidade</h3>
            <p>
              Na máxima extensão permitida por lei, o OpenJobMarket não será responsável por quaisquer danos indiretos,
              incidentais, especiais ou consequenciais decorrentes do seu uso da Plataforma.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.3 Interações entre Usuários</h3>
            <p>
              Não somos responsáveis por disputas entre usuários. Todas as relações de emprego, contratos
              e transações são exclusivamente entre os usuários.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Rescisão</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar sua conta a qualquer momento por violação destes
              Termos ou por qualquer outro motivo. Você pode encerrar sua conta a qualquer momento através das configurações da conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Modificações dos Termos</h2>
            <p>
              Podemos modificar estes Termos a qualquer momento. Notificaremos os usuários sobre mudanças significativas via e-mail
              ou notificação na Plataforma. O uso contínuo da Plataforma após as mudanças constitui aceitação.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Lei Aplicável e Resolução de Disputas</h2>
            <p>
              Estes Termos são regidos pelas leis da Inglaterra e País de Gales. Quaisquer disputas serão resolvidas através de
              arbitragem vinculativa ou nos tribunais da Inglaterra e País de Gales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Informações de Contato</h2>
            <p>
              Para perguntas sobre estes Termos, entre em contato conosco em:
            </p>
            <p className="mt-2">
              Email: info@openjobmarket.com<br />
              Endereço: OpenJobMarket, Londres, Reino Unido
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Ao usar o OpenJobMarket, você reconhece que leu, compreendeu
              e concorda em ficar vinculado a estes Termos e Condições.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
