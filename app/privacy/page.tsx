"use client"

import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

// Update this date whenever the policy text changes.
const LAST_UPDATED = new Date("2026-11-06")

export default function PrivacyPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  const li = "list-disc pl-5 space-y-1 text-slate-400"
  const strong = "text-slate-200"
  const h3 = "font-semibold text-slate-200 mt-3 mb-1"

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={getLocalePath("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />{t('privacy.backToHome')}
        </Link>

        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-7 w-7 text-emerald-400 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">{t('privacy.title')}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{t('privacy.subtitle')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-8">
            {t('privacy.lastUpdated')}: {LAST_UPDATED.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Introduction</h2>
              <p>Open Job Market ("we", "us", or "our") runs a free local jobs platform: homeowners find and contact tradespeople, tradespeople find trade jobs, and businesses post staff vacancies that people can apply for. This Privacy Policy explains how we collect, use, share and protect your information when you use our website (openjobmarket.com) and our apps for iPhone (App Store) and Android (Google Play), together "the Platform".</p>
              <p className="mt-2">We comply with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018 and, where it applies to you, the EU GDPR.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Information We Collect</h2>
              <h3 className="font-semibold text-slate-200 mb-1">2.1 Information You Give Us</h3>
              <ul className={li}>
                <li><strong className={strong}>Account:</strong> name, email address, password (stored encrypted), phone number, postcode or ZIP code, and whether you are an individual or a business.</li>
                <li><strong className={strong}>Trade jobs:</strong> the job description, trade, budget, photos you attach, and the job's location.</li>
                <li><strong className={strong}>Business and tradesperson profiles:</strong> business name, trades and services, service area, business location, photos of your work, website and contact details, and documents you upload for verification (such as insurance certificates).</li>
                <li><strong className={strong}>Vacancies:</strong> details of roles that businesses post, such as the job title, pay and description.</li>
                <li><strong className={strong}>Vacancy applications:</strong> your message and, if you attach one, your CV.</li>
                <li><strong className={strong}>Messages:</strong> messages, photos and quotes you send to other users.</li>
                <li><strong className={strong}>Reviews:</strong> ratings and reviews you leave.</li>
                <li><strong className={strong}>Support:</strong> what you send us through our contact form.</li>
              </ul>
              <h3 className={h3}>2.2 Information Collected Automatically</h3>
              <ul className={li}>
                <li><strong className={strong}>Approximate location:</strong> your country and area worked out from your IP address. We use it to show prices in your currency and to open the map near you.</li>
                <li><strong className={strong}>Precise location (only with your permission):</strong> if you allow it in your browser or phone, we use your location to centre the map. If you are a tradesperson and switch on "Available now", your app shares your current position every few seconds so customers see you as a green van on the map. We keep only your latest position, not a history, and stop when "Available now" is switched off, by you or automatically.</li>
                <li><strong className={strong}>Device and usage information:</strong> IP address, browser or app version, device type, pages viewed and features used, page speed, and error reports when something goes wrong.</li>
                <li><strong className={strong}>Notification tokens:</strong> if you allow notifications, an identifier from Apple, Google or your browser that lets us send you alerts.</li>
                <li><strong className={strong}>Cookies and local storage:</strong> see our Cookie Policy.</li>
              </ul>
              <h3 className={h3}>2.3 Information From Others</h3>
              <ul className={li}>
                <li><strong className={strong}>Sign in with Apple, Google or Facebook:</strong> if you choose one, we receive your name and email address from that service. With Sign in with Apple you can hide your email; we then receive a private relay address from Apple.</li>
                <li><strong className={strong}>Unclaimed business listings:</strong> some tradesperson listings on the map are created from publicly available business information (business name, trade, area, public phone or website). The business can claim the listing, or ask us to remove it, through our contact form.</li>
                <li><strong className={strong}>Other users:</strong> for example, reviews and messages other users send about or to you.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. How We Use Your Information</h2>
              <ul className={li}>
                <li>To create and run your account and keep you signed in.</li>
                <li>To show trade jobs, tradespeople and vacancies on the map, and to let people contact each other directly.</li>
                <li>To send job alerts and message notifications (push notifications and emails), which you can turn off.</li>
                <li>To pass your vacancy application, including your CV, to the business you applied to.</li>
                <li>To verify businesses and keep the Platform safe: preventing fraud, spam and abuse, and enforcing our Terms. To resolve problems and protect users, our support team may review the content of conversations and listings.</li>
                <li>To answer your support requests.</li>
                <li>To fix errors and improve the Platform, using usage and performance data.</li>
                <li>To meet our legal obligations.</li>
              </ul>
              <p className="mt-2">We do not take payments, and we do not use your data for advertising or sell it.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Legal Basis for Processing</h2>
              <ul className={li}>
                <li><strong className={strong}>Contract:</strong> to provide the Platform you signed up for.</li>
                <li><strong className={strong}>Consent:</strong> precise location, notifications and optional features, which you can withdraw at any time in your browser or phone settings.</li>
                <li><strong className={strong}>Legitimate interests:</strong> keeping the Platform safe, preventing fraud, improving our services, and showing publicly available business listings.</li>
                <li><strong className={strong}>Legal obligation:</strong> where the law requires us to keep or share information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Who Can See or Receive Your Information</h2>
              <h3 className="font-semibold text-slate-200 mb-1">5.1 Other Users</h3>
              <ul className={li}>
                <li>Business and tradesperson profiles, trade jobs and vacancies are public, so that people can find them.</li>
                <li>For trade jobs, the map shows an approximate location; the exact address is not shown publicly.</li>
                <li>Homeowners' phone numbers and addresses are not public.</li>
                <li>Your CV is shared only with the business you applied to.</li>
                <li>Messages are visible to the people in the conversation, and to our support team when needed to resolve a problem (see section 3).</li>
              </ul>
              <h3 className={h3}>5.2 Service Providers</h3>
              <p className="mb-1">We use trusted providers who process data only on our instructions:</p>
              <ul className={li}>
                <li><strong className={strong}>Supabase:</strong> database, file storage and sign-in.</li>
                <li><strong className={strong}>Vercel:</strong> website and app hosting, and page-speed measurements.</li>
                <li><strong className={strong}>Sentry:</strong> error reports.</li>
                <li><strong className={strong}>Resend:</strong> sending emails.</li>
                <li><strong className={strong}>Apple Push Notification service and Google Firebase Cloud Messaging:</strong> delivering notifications to your phone.</li>
                <li><strong className={strong}>OpenStreetMap (Nominatim):</strong> turning a postcode, ZIP code or town you type into a map position.</li>
                <li><strong className={strong}>Apple, Google and Facebook:</strong> only if you choose to sign in with them.</li>
              </ul>
              <p className="mt-2">Downloading our apps from the App Store or Google Play is covered by Apple's and Google's own privacy policies.</p>
              <h3 className={h3}>5.3 Legal Requirements</h3>
              <p>We may share information where the law requires it, to respond to valid requests from authorities, or to protect the rights and safety of our users and of Open Job Market.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. How Long We Keep Information</h2>
              <ul className={li}>
                <li><strong className={strong}>Your account:</strong> while your account is open. When you delete your account, we delete your personal data within 30 days, except what we must keep by law.</li>
                <li><strong className={strong}>Job photos:</strong> deleted automatically once the job has been closed for 30 days.</li>
                <li><strong className={strong}>Photos in messages:</strong> deleted automatically 30 days after the job is completed or cancelled, and in any case after 90 days.</li>
                <li><strong className={strong}>Live location:</strong> only your latest position, and only while "Available now" is on.</li>
                <li><strong className={strong}>CVs:</strong> kept with your application while your account is open, and deleted when you delete your account.</li>
                <li><strong className={strong}>Support requests:</strong> up to 3 years.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">7. Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className={li}>
                <li><strong className={strong}>Access</strong> the personal data we hold about you.</li>
                <li><strong className={strong}>Correct</strong> inaccurate or incomplete data. You can edit most of it in your profile.</li>
                <li><strong className={strong}>Erase</strong> your data. You can delete your account at any time in Account Settings, in the website or in the app.</li>
                <li><strong className={strong}>Restrict</strong> or <strong className={strong}>object to</strong> how we use your data.</li>
                <li><strong className={strong}>Data portability:</strong> receive your data in a portable format.</li>
                <li><strong className={strong}>Withdraw consent</strong> at any time, for example by turning off location or notifications.</li>
              </ul>
              <p className="mt-2">To use any of these rights, contact us through our <a href="/contact" className="text-emerald-400 hover:text-emerald-300">contact form</a>. If you are unhappy with how we handle your data, you can complain to the Information Commissioner's Office (ico.org.uk) or to your local data protection authority.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">8. App Permissions</h2>
              <p className="mb-1">Our apps ask for these permissions only when a feature needs them. All are optional and can be changed at any time in your phone's settings:</p>
              <ul className={li}>
                <li><strong className={strong}>Location:</strong> to centre the map on you and, for tradespeople, to show your green van while "Available now" is on.</li>
                <li><strong className={strong}>Notifications:</strong> for job alerts and new messages.</li>
                <li><strong className={strong}>Camera and photos:</strong> to attach photos to jobs, messages and your profile.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">9. Data Security</h2>
              <ul className={li}>
                <li>Encryption of data in transit (HTTPS/TLS).</li>
                <li>Database access rules, so each user can reach only their own private data.</li>
                <li>CVs and verification documents are kept in private storage, opened only through short-lived secure links.</li>
                <li>Limited staff access to personal data.</li>
              </ul>
              <p className="mt-2">No method of transmission over the internet is 100% secure, so we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">10. International Data Transfers</h2>
              <p>Some of our service providers process data outside the UK, including in the United States. Where they do, we rely on safeguards approved under UK law, such as the UK International Data Transfer Agreement or Addendum, adequacy regulations, and the UK Extension to the EU-U.S. Data Privacy Framework.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">11. Children</h2>
              <p>You must be 18 or over to create an account. We do not knowingly collect personal information from children. If we find that we have, we will delete it promptly.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">12. Cookies</h2>
              <p>We use cookies and similar technologies to keep you signed in, remember your preferences and measure performance. For details, see our <Link href={getLocalePath("/cookies")} className="text-emerald-400 hover:text-emerald-300 underline">Cookie Policy</Link>.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">13. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time, for example when we add new features. We will tell you about significant changes by email or in the Platform. The "Last updated" date at the top shows when it last changed.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">14. Contact Us</h2>
              <p>For privacy questions or to use your rights, contact us through our <a href="/contact" className="text-emerald-400 hover:text-emerald-300">contact form</a>.</p>
              <p className="mt-2 text-slate-400">Open Job Market, London, United Kingdom</p>
            </section>

            <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-300">
              <strong>Your Privacy Matters:</strong> We are committed to transparency and protecting your personal information. If you have any concerns about how we handle your data, please contact us.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
