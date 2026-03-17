import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Terms of Service | Open Job Market',
  description: 'Read the Open Job Market terms of service. Understand your rights and responsibilities when using our platform to find or offer trade services.',
  path: '/terms',
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
