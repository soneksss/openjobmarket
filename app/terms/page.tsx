"use client"

import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function TermsPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={getLocalePath("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />{t('terms.backToHome')}
        </Link>

        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-7 w-7 text-emerald-400 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">{t('terms.title')}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{t('terms.subtitle')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-8">
            {t('terms.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Acceptance of Terms</h2>
              <p>By accessing and using OpenJobMarket ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Definitions</h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">"Platform"</strong> refers to OpenJobMarket website and all its services</li>
                <li><strong className="text-slate-200">"User"</strong> refers to any person accessing or using the Platform</li>
                <li><strong className="text-slate-200">"Homeowner"</strong> refers to individuals posting tasks or jobs</li>
                <li><strong className="text-slate-200">"Tradesperson / Company"</strong> refers to businesses or individuals offering trade services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. User Accounts</h2>
              <h3 className="font-semibold text-slate-200 mb-1">3.1 Registration</h3>
              <p>You must create an account to access certain features. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">3.2 Account Security</h3>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Use of Services</h2>
              <h3 className="font-semibold text-slate-200 mb-1">4.1 Permitted Use</h3>
              <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">4.2 Prohibited Activities</h3>
              <p className="mb-2">You may not:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Post false, misleading, or fraudulent information</li>
                <li>Impersonate any person or entity</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use automated systems to access the Platform without authorisation</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Job Postings and Applications</h2>
              <p>All job postings must be accurate and lawful. OpenJobMarket acts as a marketplace connecting users — we are not an employer or party to any employment relationship formed through the Platform.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. Payments and Subscriptions</h2>
              <p>Certain features may require a paid subscription. Subscription fees are non-refundable except as required by law. Subscriptions automatically renew unless cancelled before the renewal date.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">7. Content and Intellectual Property</h2>
              <p>You retain ownership of content you post. By posting content, you grant us a licence to use, display, and distribute that content on the Platform. All Platform content is owned by OpenJobMarket or its licensors.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">8. Privacy and Data Protection</h2>
              <p>Your use of the Platform is governed by our <Link href={getLocalePath("/privacy")} className="text-emerald-400 hover:text-emerald-300 underline">Privacy Policy</Link>. We comply with GDPR and other applicable data protection regulations.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">9. Disclaimers and Limitations of Liability</h2>
              <p>The Platform is provided "as is" without warranties of any kind. To the maximum extent permitted by law, OpenJobMarket shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">10. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms. You may terminate your account at any time through account settings.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">11. Governing Law</h2>
              <p>These Terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">12. Contact Information</h2>
              <p>Use our <a href="/contact" className="text-emerald-400 hover:text-emerald-300">contact form</a>.<br />Address: OpenJobMarket, London, United Kingdom</p>
            </section>

            <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-300">
              By using OpenJobMarket, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
