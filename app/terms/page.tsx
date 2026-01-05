"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function TermsPage() {
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
          {t('terms.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('terms.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('terms.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('terms.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using OpenJobMarket ("the Platform"), you agree to be bound by these Terms and Conditions.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>"Platform"</strong> refers to OpenJobMarket website and all its services</li>
              <li><strong>"User"</strong> refers to any person accessing or using the Platform</li>
              <li><strong>"Professional"</strong> refers to individuals offering their services</li>
              <li><strong>"Company"</strong> refers to businesses seeking to hire professionals</li>
              <li><strong>"Homeowner"</strong> refers to individuals posting tasks or jobs</li>
              <li><strong>"Contractor"</strong> refers to self-employed professionals or traders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold mb-3">3.1 Registration</h3>
            <p>
              You must create an account to access certain features. You agree to provide accurate, current,
              and complete information during registration and to update such information as necessary.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Account Types</h3>
            <p>
              The Platform offers different account types (Professional, Company, Homeowner, Contractor).
              You must select the appropriate account type and comply with all requirements specific to that type.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Use of Services</h2>
            <h3 className="text-xl font-semibold mb-3">4.1 Permitted Use</h3>
            <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms.</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Prohibited Activities</h3>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use automated systems to access the Platform without authorization</li>
              <li>Attempt to gain unauthorized access to any portion of the Platform</li>
              <li>Interfere with or disrupt the Platform's operation</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Job Postings and Applications</h2>
            <h3 className="text-xl font-semibold mb-3">5.1 Job Postings</h3>
            <p>
              Companies and Homeowners may post jobs or tasks. All job postings must be accurate, lawful,
              and comply with applicable employment laws.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Applications</h3>
            <p>
              Professionals and Contractors may apply for jobs. Applications must contain accurate information
              about qualifications and experience.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Platform Role</h3>
            <p>
              OpenJobMarket acts as a marketplace connecting users. We are not an employer, employment agency,
              or party to any employment relationship formed through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Payments and Subscriptions</h2>
            <h3 className="text-xl font-semibold mb-3">6.1 Subscription Plans</h3>
            <p>
              Certain features require a paid subscription. Subscription fees are non-refundable except as
              required by law.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Payment Processing</h3>
            <p>
              All payments are processed securely through third-party payment processors. We do not store
              your complete payment card information.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.3 Auto-Renewal</h3>
            <p>
              Subscriptions automatically renew unless cancelled before the renewal date. You may cancel
              your subscription at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Content and Intellectual Property</h2>
            <h3 className="text-xl font-semibold mb-3">7.1 User Content</h3>
            <p>
              You retain ownership of content you post. By posting content, you grant us a license to use,
              display, and distribute that content on the Platform.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Platform Content</h3>
            <p>
              All Platform content, including text, graphics, logos, and software, is owned by OpenJobMarket
              or its licensors and protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Privacy and Data Protection</h2>
            <p>
              Your use of the Platform is also governed by our Privacy Policy. We comply with GDPR and other
              applicable data protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Disclaimers and Limitations of Liability</h2>
            <h3 className="text-xl font-semibold mb-3">9.1 No Warranties</h3>
            <p>
              The Platform is provided "as is" without warranties of any kind. We do not guarantee that the
              Platform will be error-free, secure, or uninterrupted.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.2 Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, OpenJobMarket shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Platform.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.3 User Interactions</h3>
            <p>
              We are not responsible for disputes between users. All employment relationships, contracts,
              and transactions are solely between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these
              Terms or for any other reason. You may terminate your account at any time through account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Modifications to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify users of significant changes via email
              or Platform notification. Continued use of the Platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes shall be resolved through
              binding arbitration or in the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              Email: info@openjobmarket.com<br />
              Address: OpenJobMarket, London, United Kingdom
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> By using OpenJobMarket, you acknowledge that you have read, understood,
              and agree to be bound by these Terms and Conditions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
