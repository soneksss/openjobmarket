import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Ajuda & Suporte - Perguntas Frequentes',
  description: 'Obtenha ajuda com o OpenJobMarket. Encontre respostas para perguntas frequentes sobre publicação de vagas, criação de currículo, candidatura a posições e muito mais.',
  path: '/help',
  locale: 'pt-BR',
})

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
