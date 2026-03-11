"use client"

import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function PrivacyPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

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
            {t('privacy.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Introduction</h2>
              <p>OpenJobMarket ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.</p>
              <p className="mt-2">We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Information We Collect</h2>
              <h3 className="font-semibold text-slate-200 mb-1">2.1 Information You Provide</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Account Information:</strong> Name, email address, password, phone number</li>
                <li><strong className="text-slate-200">Profile Information:</strong> Professional title, bio, skills, experience, location, photos</li>
                <li><strong className="text-slate-200">Company Information:</strong> Company name, registration details, business address</li>
                <li><strong className="text-slate-200">Payment Information:</strong> Billing address, payment card details (processed securely by third parties)</li>
                <li><strong className="text-slate-200">Communications:</strong> Messages sent through the Platform, support inquiries</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Usage Data:</strong> Pages visited, features used, time spent on Platform</li>
                <li><strong className="text-slate-200">Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong className="text-slate-200">Location Data:</strong> Approximate location based on IP address (with your consent)</li>
                <li><strong className="text-slate-200">Cookies and Tracking:</strong> See our Cookie Policy for details</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Social media profiles (if you connect your accounts)</li>
                <li>Payment processors (transaction confirmations)</li>
                <li>Analytics providers (aggregated usage statistics)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. How We Use Your Information</h2>
              <h3 className="font-semibold text-slate-200 mb-1">3.1 Platform Services</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Creating and managing your account</li>
                <li>Facilitating job postings and applications</li>
                <li>Enabling communication between users</li>
                <li>Processing payments and subscriptions</li>
                <li>Providing customer support</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">3.2 Improvement and Development</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Analysing Platform usage to improve services</li>
                <li>Developing new features and functionality</li>
                <li>Conducting research and analytics</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">3.3 Communication</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Sending service notifications and updates</li>
                <li>Responding to inquiries and support requests</li>
                <li>Sending marketing communications (with your consent)</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">3.4 Legal and Safety</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Complying with legal obligations</li>
                <li>Preventing fraud and abuse</li>
                <li>Protecting user safety and security</li>
                <li>Enforcing our Terms and Conditions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Legal Basis for Processing (GDPR)</h2>
              <p className="mb-2">We process your personal data based on:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Contract:</strong> To provide services you've requested</li>
                <li><strong className="text-slate-200">Consent:</strong> For marketing communications and optional features</li>
                <li><strong className="text-slate-200">Legitimate Interests:</strong> To improve our Platform and prevent fraud</li>
                <li><strong className="text-slate-200">Legal Obligation:</strong> To comply with applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Sharing Your Information</h2>
              <h3 className="font-semibold text-slate-200 mb-1">5.1 With Other Users</h3>
              <p>Your profile information is visible to other users based on your account type and privacy settings. Homeowners can view tradesperson profiles, and tradespeople can view job postings.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">5.2 With Service Providers</h3>
              <p className="mb-1">We share data with trusted third parties who help us operate the Platform:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Cloud hosting providers (e.g., Supabase, Vercel)</li>
                <li>Payment processors (e.g., Stripe)</li>
                <li>Email service providers</li>
                <li>Analytics providers</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">5.3 Legal Requirements</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Comply with legal processes</li>
                <li>Respond to government requests</li>
                <li>Protect our rights and property</li>
                <li>Prevent fraud or illegal activity</li>
              </ul>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">5.4 No Selling of Data</h3>
              <p>We do not sell your personal information to third parties for their marketing purposes.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. Data Retention</h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Active accounts: Data retained while account is active</li>
                <li>Deleted accounts: Most data deleted within 30 days; some data retained for legal compliance</li>
                <li>Transaction records: Retained for 7 years for tax and accounting purposes</li>
                <li>Support communications: Retained for 3 years</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">7. Your Rights (GDPR)</h2>
              <p className="mb-2">If you are in the EU/EEA, you have the following rights:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-slate-200">Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong className="text-slate-200">Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong className="text-slate-200">Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong className="text-slate-200">Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong className="text-slate-200">Right to Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong className="text-slate-200">Right to Withdraw Consent:</strong> Withdraw consent for processing at any time</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <a href="mailto:info@openjobmarket.com" className="text-emerald-400 hover:text-emerald-300">info@openjobmarket.com</a></p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">8. Data Security</h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Encryption of data in transit (SSL/TLS)</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication</li>
                <li>Employee training on data protection</li>
              </ul>
              <p className="mt-2">No method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">9. International Data Transfers</h2>
              <p className="mb-2">Your information may be transferred to and processed in countries outside your country of residence. We ensure appropriate safeguards are in place, including:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Adequacy decisions for certain countries</li>
                <li>Certified frameworks (e.g., EU-U.S. Data Privacy Framework)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">10. Children's Privacy</h2>
              <p>Our Platform is not intended for users under 16 years of age. We do not knowingly collect personal information from children under 16. If we discover we have collected such information, we will promptly delete it.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">11. Cookies and Tracking</h2>
              <p>We use cookies and similar tracking technologies. For detailed information, please see our <Link href={getLocalePath("/cookies")} className="text-emerald-400 hover:text-emerald-300 underline">Cookie Policy</Link>.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">12. Changes to Privacy Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or Platform notification. The "Last Updated" date at the top of this policy indicates when it was last revised.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">13. Contact Information</h2>
              <p>For privacy-related questions or to exercise your rights:</p>
              <p className="mt-2 text-slate-400">
                <strong className="text-slate-200">Data Protection Officer</strong><br />
                Email: <a href="mailto:info@openjobmarket.com" className="text-emerald-400 hover:text-emerald-300">info@openjobmarket.com</a><br />
                Address: OpenJobMarket, London, United Kingdom
              </p>
            </section>

            <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-300">
              <strong>Your Privacy Matters:</strong> We are committed to transparency and protecting your personal information. If you have any concerns about how we handle your data, please don't hesitate to contact us.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
