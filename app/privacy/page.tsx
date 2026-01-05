"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function PrivacyPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'

  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href={getLocalePath("/")}
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('privacy.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('privacy.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('privacy.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('privacy.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p>
              OpenJobMarket ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our Platform.
            </p>
            <p className="mt-3">
              We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password, phone number</li>
              <li><strong>Profile Information:</strong> Professional title, bio, skills, experience, location, photos</li>
              <li><strong>CV/Resume:</strong> Employment history, education, qualifications</li>
              <li><strong>Company Information:</strong> Company name, registration details, business address</li>
              <li><strong>Payment Information:</strong> Billing address, payment card details (processed securely by third parties)</li>
              <li><strong>Communications:</strong> Messages sent through the Platform, support inquiries</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on Platform</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address (with your consent)</li>
              <li><strong>Cookies and Tracking:</strong> See our Cookie Policy for details</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Social media profiles (if you connect your accounts)</li>
              <li>Payment processors (transaction confirmations)</li>
              <li>Analytics providers (aggregated usage statistics)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Platform Services</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Creating and managing your account</li>
              <li>Facilitating job postings and applications</li>
              <li>Enabling communication between users</li>
              <li>Processing payments and subscriptions</li>
              <li>Providing customer support</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Improvement and Development</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analyzing Platform usage to improve services</li>
              <li>Developing new features and functionality</li>
              <li>Conducting research and analytics</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Communication</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sending service notifications and updates</li>
              <li>Responding to inquiries and support requests</li>
              <li>Sending marketing communications (with your consent)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Legal and Safety</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Complying with legal obligations</li>
              <li>Preventing fraud and abuse</li>
              <li>Protecting user safety and security</li>
              <li>Enforcing our Terms and Conditions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Legal Basis for Processing (GDPR)</h2>
            <p>We process your personal data based on:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract:</strong> To provide services you've requested</li>
              <li><strong>Consent:</strong> For marketing communications and optional features</li>
              <li><strong>Legitimate Interests:</strong> To improve our Platform and prevent fraud</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Sharing Your Information</h2>

            <h3 className="text-xl font-semibold mb-3">5.1 With Other Users</h3>
            <p>
              Your profile information is visible to other users based on your account type and privacy settings.
              Companies can view professional profiles, and professionals can view job postings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 With Service Providers</h3>
            <p>We share data with trusted third parties who help us operate the Platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cloud hosting providers (e.g., Supabase, Vercel)</li>
              <li>Payment processors (e.g., Stripe)</li>
              <li>Email service providers</li>
              <li>Analytics providers</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Legal Requirements</h3>
            <p>We may disclose information when required by law or to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Comply with legal processes</li>
              <li>Respond to government requests</li>
              <li>Protect our rights and property</li>
              <li>Prevent fraud or illegal activity</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.4 Business Transfers</h3>
            <p>
              If OpenJobMarket is involved in a merger, acquisition, or sale of assets, your information may be
              transferred as part of that transaction.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.5 No Selling of Data</h3>
            <p>
              We do not sell your personal information to third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to provide our services and comply with legal
              obligations:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Active accounts: Data retained while account is active</li>
              <li>Deleted accounts: Most data deleted within 30 days; some data retained for legal compliance</li>
              <li>Transaction records: Retained for 7 years for tax and accounting purposes</li>
              <li>Support communications: Retained for 3 years</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Your Rights (GDPR)</h2>
            <p>If you are in the EU/EEA, you have the following rights:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for processing at any time</li>
              <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your data protection authority</li>
            </ul>

            <p className="mt-4">
              To exercise these rights, contact us at info@openjobmarket.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Data Security</h2>
            <p>We implement security measures to protect your information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit (SSL/TLS)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute
              security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside your country of residence.
              We ensure appropriate safeguards are in place for such transfers, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Adequacy decisions for certain countries</li>
              <li>Certified frameworks (e.g., EU-U.S. Data Privacy Framework)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
            <p>
              Our Platform is not intended for users under 16 years of age. We do not knowingly collect personal
              information from children under 16. If we discover we have collected such information, we will
              promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies. For detailed information, please see our
              <Link href="/cookies" className="text-blue-600 hover:underline"> Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via
              email or Platform notification. The "Last Updated" date at the top of this policy indicates when
              it was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at:
            </p>
            <p className="mt-2">
              <strong>Data Protection Officer</strong><br />
              Email: info@openjobmarket.com<br />
              Address: OpenJobMarket, London, United Kingdom
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Your Privacy Matters:</strong> We are committed to transparency and protecting your personal
              information. If you have any concerns about how we handle your data, please don't hesitate to
              contact us.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
