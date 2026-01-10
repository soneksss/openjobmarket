import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Help & Support - Frequently Asked Questions',
  description: 'Get help with OpenJobMarket. Find answers to frequently asked questions about posting jobs, creating your CV, applying for positions, and more.',
  path: '/help',
  locale: 'en',
})

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
