import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Cookie Policy | Open Job Market',
  description: 'Open Job Market cookie policy. Find out how we use cookies to improve your experience on our platform.',
  path: '/cookies',
})

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
