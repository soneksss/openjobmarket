import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Contact Us | Open Job Market',
  description: 'Get in touch with the Open Job Market team. We\'re here to help homeowners and tradespeople with any questions.',
  path: '/contact',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
