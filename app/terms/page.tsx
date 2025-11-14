import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Open Job Market
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">📄 Terms & Conditions</CardTitle>
          <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-blue-800">
              Welcome to Open Job Market. These Terms & Conditions ("Terms") govern your use of our website{" "}
              <strong>www.openjobmarket.com</strong> (the "Platform"), operated by Open Job Market Ltd,
              a company registered in the United Kingdom.
            </p>
            <p className="text-blue-800 mt-2">
              By accessing or using the Platform, you agree to these Terms. If you do not agree, please do not use the Platform.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Our Services</h2>
            <div className="space-y-3">
              <p><strong>For Companies:</strong> The Platform allows companies to search for and connect with professionals and trades ("Talents") globally, and to post job offers.</p>
              <p><strong>For Talents:</strong> Professionals and tradespeople can create profiles, showcase skills, and search for job opportunities.</p>
              <p><strong>Free Now, Paid Later:</strong> At present, the Platform is free to use. In the future, we may introduce paid features, such as fees for posting jobs or accessing premium services. Any fees will be clearly communicated before purchase.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must create an account to access certain features.</li>
              <li>You agree to provide accurate, complete, and up-to-date information.</li>
              <li>You are responsible for maintaining the confidentiality of your login details.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Companies are solely responsible for the accuracy, legality, and content of job postings.</li>
              <li>Talents are solely responsible for the accuracy of their profiles, skills, and any information they make visible.</li>
              <li>Users must not post false, misleading, fraudulent, or discriminatory content.</li>
              <li>Users are responsible for their own interactions with others on the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Data Protection & Privacy</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We respect your privacy and comply with UK GDPR and other applicable data protection laws.</li>
              <li>User data is securely stored using Supabase.</li>
              <li>You may choose whether your personal data (e.g., name, contact details) is visible in search results.</li>
              <li>Our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains in detail how your data is collected, used, and stored.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Payments & Fees (Future Features)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Currently, use of the Platform is free.</li>
              <li>In the future, certain services may require payment (e.g., job postings, premium visibility).</li>
              <li>All fees will be clearly displayed before purchase, and payments will be processed securely.</li>
              <li>We may change pricing from time to time, with reasonable notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Prohibited Uses</h2>
            <p className="mb-3">You agree not to use the Platform to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post or share false, misleading, fraudulent, or illegal content.</li>
              <li>Discriminate based on race, gender, religion, disability, or any other protected characteristic.</li>
              <li>Send spam, unsolicited messages, or advertising.</li>
              <li>Attempt to scrape, copy, or extract data from the Platform.</li>
              <li>Harm, disrupt, or interfere with the security or functionality of the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All content, branding, and functionality of the Platform are owned by Open Job Market Ltd.</li>
              <li>Users retain rights to their own content but grant us a license to display and distribute it through the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Disclaimer of Liability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Platform is provided "as is" and "as available".</li>
              <li>We do not guarantee the accuracy, completeness, or availability of job postings, profiles, or other content.</li>
              <li>We are not responsible for any interactions, contracts, or outcomes between companies and talents.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may suspend or terminate your account if you breach these Terms.</li>
              <li>You may delete your account at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Governing Law & Jurisdiction</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>These Terms are governed by and construed in accordance with the laws of England and Wales.</li>
              <li>Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Changes to These Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may update these Terms from time to time.</li>
              <li>Continued use of the Platform after changes means you accept the updated Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>For questions or concerns, please contact us at:</p>
              <div className="mt-2 space-y-1">
                <p>📧 <a href="mailto:soneksss@gmail.com" className="text-primary hover:underline">soneksss@gmail.com</a></p>
                <p>🏢 Open Job Market Ltd, United Kingdom</p>
              </div>
            </div>
          </section>

          <div className="border-t pt-6 mt-8">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
              <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}