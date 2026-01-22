import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UnifiedSearchPage } from "@/components/unified-search-page"
import { getAdminUser } from "@/lib/admin-auth"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"
import BannerMap from "@/components/BannerMap"
import { GuestBanner } from "@/components/guest-banner"
import { createClient } from "@/lib/server"
import Link from "next/link"
import { generateSEO } from "@/lib/seo"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

// SEO Metadata for Brazilian Portuguese version
export const metadata = generateSEO({
  title: 'Encontre Empregos, Contrate Talentos e Conecte-se com Profissionais',
  description: 'Encontre empregos, contrate profissionais e conecte-se com profissionais qualificados no OpenJobMarket. Publique vagas, construa seu currículo e descubra oportunidades no Reino Unido e Brasil.',
  path: '/',
  locale: 'pt-BR',
})

export default async function HomePageBR() {
  console.log("[v0] HomePage BR rendering")

  // Check if current user is an admin
  let adminUser = null
  try {
    adminUser = await getAdminUser()
  } catch (error) {
    console.error("Failed to check admin user:", error)
  }

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      {adminUser && (
        <div className="w-full bg-white border-b border-gray-200 py-1 sm:py-2">
          <div className="container mx-auto px-2 sm:px-4">
            <div className="flex justify-center">
              <Link href="/admin/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm md:text-base font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Painel de Administração
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <section
        className="relative py-2 overflow-hidden bg-gray-50"
      >
        {/* Floating elements for visual interest */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-300/20 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="container mx-auto px-2 sm:px-4 relative z-10">
          <UnifiedSearchPage isSignedIn={!!user} />
        </div>
      </section>

      {/* Guest banner */}
      {!user && <GuestBanner hideOnSearch={true} />}

      <section className="py-3 md:py-5 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-2 md:mb-3">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-1.5 text-balance text-blue-900">
              Histórias de Sucesso
            </h2>
            <p className="text-xs md:text-sm text-gray-600 max-w-3xl mx-auto text-pretty px-2">
              Resultados reais de profissionais e empresas que encontraram a combinação perfeita
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto">
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-emerald-100 to-emerald-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-UAuvnlHA8UfziXp43l14u51SSVEFHh.png"
                  alt="Equipe comemorando colocação de emprego bem-sucedida"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 md:p-3">
                <h3 className="text-base md:text-lg font-bold mb-1 text-gray-800">
                  TechTeam Solutions - Diretora de RH
                </h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-1.5 md:mb-2">
                  "Nossa equipe inteira de desenvolvimento encontrou melhores posições através do Open Job Market. A abordagem colaborativa nos ajudou a fazer a transição juntos para uma startup que valorizava nosso trabalho em equipe."
                </p>
                <div className="flex items-center text-emerald-600 font-semibold text-xs md:text-sm">
                  <span className="text-lg md:text-xl mr-1.5">👥</span>
                  <span>4 membros da equipe contratados juntos</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-rC8EooxhaNniFv0gUXUwir3AgEmlSx.png"
                  alt="Profissional trabalhando tarde alcançando sucesso"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 md:p-3">
                <h3 className="text-base md:text-lg font-bold mb-1 text-gray-800">Maria R. - Cientista de Dados</h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-1.5 md:mb-2">
                  "Trabalhando até tarde no meu projeto atual, procurei discretamente por oportunidades remotas. Encontrei meu emprego dos sonhos em uma empresa Fortune 500 com total flexibilidade remota e melhor equilíbrio entre vida pessoal e profissional."
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-xs md:text-sm">
                  <span className="text-lg md:text-xl mr-1.5">🏠</span>
                  <span>Posição 100% remota garantida</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image.png%281%29%281%29%281%29-Lq3ft08YXKDBM29jKfdrWN0e8WQBWO.jpeg"
                  alt="Profissional de construção comemorando avanço na carreira"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 md:p-3">
                <h3 className="text-base md:text-lg font-bold mb-1 text-gray-800">James K. - Gerente de Projetos</h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-1.5 md:mb-2">
                  "De canteiros de obras à liderança corporativa. A plataforma me ajudou a fazer a transição das minhas habilidades de gestão de projetos para uma posição sênior em uma grande empresa de infraestrutura."
                </p>
                <div className="flex items-center text-orange-600 font-semibold text-xs md:text-sm">
                  <span className="text-lg md:text-xl mr-1.5">⬆️</span>
                  <span>Avanço na carreira para liderança</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-2 md:mt-3">
            <p className="text-gray-500 text-xs md:text-sm mb-2 md:mb-2.5">
              Junte-se a milhares que encontraram a combinação perfeita
            </p>
            <Button
              size="default"
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              asChild
            >
              <Link href="/br/onboarding">Comece Sua História de Sucesso</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-3 md:py-5 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-2 md:mb-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-1.5 text-white text-balance">
              Por Que Escolher o Open Job Market?
            </h2>
            <p className="text-xs md:text-sm text-white/90 max-w-3xl mx-auto text-pretty px-2">
              Recursos revolucionários que transformam como você encontra empregos e talentos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto">
            <div className="text-center text-white">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-1.5 md:mb-2 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2">Descoberta Baseada em Mapas</h3>
              <p className="text-xs md:text-xs text-white/90 leading-relaxed">
                Visualize oportunidades geograficamente. Encontre empregos e talentos com base na localização, preferências de deslocamento e insights regionais.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-1.5 md:mb-2 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2">Busca de Emprego Anônima</h3>
              <p className="text-xs md:text-xs text-white/90 leading-relaxed">
                Busque oportunidades sem revelar sua identidade. Seu empregador atual nunca saberá que você está procurando.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-1.5 md:mb-2 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2">Alcance Global</h3>
              <p className="text-xs md:text-xs text-white/90 leading-relaxed">
                Conecte-se com oportunidades em todo o mundo. Trabalho remoto, posições internacionais e empregos locais, tudo em uma plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
