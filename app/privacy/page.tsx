import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Shield, Eye, Users, Database, Globe } from "lucide-react"

export default function PrivacyPage() {
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
          <CardTitle className="text-3xl">📜 Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Effective Date: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none space-y-6">
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <p className="text-green-800">
              Open Job Market Ltd ("we", "our", "us") operates the website{" "}
              <strong>www.openjobmarket.com</strong> (the "Platform").
              This Privacy Policy explains how we collect, use, share, and protect your personal information when you use the Platform.
            </p>
            <p className="text-green-800 mt-2">
              By using the Platform, you agree to this Privacy Policy.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              1. Information We Collect
            </h2>
            <p className="mb-4">We may collect the following types of information:</p>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">a) Account Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-blue-700">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Password (encrypted)</li>
                  <li>Account type (Company, Professional/Talent, Admin)</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">b) Profile Information (optional, chosen by you)</h3>
                <ul className="list-disc pl-6 space-y-1 text-purple-700">
                  <li>Skills, experience, and trade information</li>
                  <li>Job preferences</li>
                  <li>Location (approximate or exact, if you choose)</li>
                  <li>Whether your profile is visible in search</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">c) Job Postings (Companies)</h3>
                <ul className="list-disc pl-6 space-y-1 text-orange-700">
                  <li>Job title, description, requirements</li>
                  <li>Company information</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">d) Usage Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>IP address, browser type, device type</li>
                  <li>Pages visited and actions taken on the Platform</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">e) Future Paid Services</h3>
                <ul className="list-disc pl-6 space-y-1 text-green-700">
                  <li>Billing details (if you purchase premium features)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              2. How We Use Your Information
            </h2>
            <p className="mb-3">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our services</li>
              <li>Match companies with relevant talents</li>
              <li>Allow talents to showcase their skills and find opportunities</li>
              <li>Securely manage accounts and authenticate users</li>
              <li>Communicate with you (e.g., updates, notifications)</li>
              <li>Comply with legal obligations</li>
            </ul>
            <div className="bg-red-50 border border-red-200 p-3 rounded mt-4">
              <p className="text-red-800 font-semibold">We do not sell your personal data to third parties.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              3. Data Storage & Security
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data is stored securely in Supabase cloud infrastructure</li>
              <li>Passwords are encrypted and never stored in plain text</li>
              <li>We use security measures (encryption, access controls) to protect your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Data Sharing</h2>
            <p className="mb-3">We may share data only with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers (e.g., hosting, payment processors for future paid features)</li>
              <li>Legal authorities if required by law</li>
              <li>Other users, only to the extent you make your data visible (e.g., if you choose to appear in search)</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded mt-4">
              <p className="text-blue-800 font-semibold">We do not sell or rent your personal information.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-indigo-600" />
              5. Your Choices & Rights (GDPR)
            </h2>
            <p className="mb-3">You have the right to:</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-indigo-50 p-3 rounded">
                <ul className="list-disc pl-6 space-y-1 text-indigo-800">
                  <li>Access the personal data we hold about you</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Request deletion of your account and data</li>
                </ul>
              </div>
              <div className="bg-indigo-50 p-3 rounded">
                <ul className="list-disc pl-6 space-y-1 text-indigo-800">
                  <li>Restrict or object to processing</li>
                  <li>Export your data (data portability)</li>
                  <li>Withdraw consent (e.g., for optional visibility)</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm">
              To exercise your rights, contact us at:{" "}
              <a href="mailto:soneksss@gmail.com" className="text-primary hover:underline">
                soneksss@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Cookies & Tracking</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may use cookies and similar technologies to improve your experience (e.g., login sessions, analytics)</li>
              <li>You can disable cookies in your browser, but some features may not work</li>
            </ul>
            <p className="mt-3">
              See our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for more details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We keep your data as long as your account is active</li>
              <li>If you delete your account, we delete or anonymize your data unless required for legal or security reasons</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-green-600" />
              8. International Data Transfers
            </h2>
            <p>
              Since our Platform is global, your data may be accessed outside the UK. We ensure appropriate
              safeguards (such as standard contractual clauses) are in place.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              Our Platform is not intended for users under 16. If we learn that we have collected data
              from a child under 16, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes,
              we will notify you by email or through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>For questions or to exercise your privacy rights, contact us at:</p>
              <div className="mt-2 space-y-1">
                <p>📧 <a href="mailto:soneksss@gmail.com" className="text-primary hover:underline">soneksss@gmail.com</a></p>
                <p>🏢 Open Job Market Ltd, United Kingdom</p>
              </div>
            </div>
          </section>

          <div className="border-t pt-6 mt-8">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
              <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
