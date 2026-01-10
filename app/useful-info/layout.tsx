import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Useful Information - Guidance for Jobseekers, Employers, Tradespeople & Homeowners',
  description: 'Essential guidance for jobseekers finding work, employers hiring talent, tradespeople growing their business, and homeowners hiring safely. Tips, advice, and best practices for success on OpenJobMarket.',
  path: '/useful-info',
  locale: 'en',
})

export default function UsefulInfoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
