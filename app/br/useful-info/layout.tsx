import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Informações Úteis - Orientação para Candidatos, Empregadores, Profissionais e Proprietários',
  description: 'Orientação essencial para candidatos a emprego, empregadores contratando talentos, profissionais expandindo seus negócios e proprietários contratando com segurança. Dicas, conselhos e melhores práticas para o sucesso no OpenJobMarket.',
  path: '/useful-info',
  locale: 'pt-BR',
})

export default function UsefulInfoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
