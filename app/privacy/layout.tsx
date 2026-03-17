import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'Privacy Policy | Open Job Market',
  description: 'Open Job Market privacy policy. Learn how we collect, use and protect your personal data in compliance with UK GDPR.',
  path: '/privacy',
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
