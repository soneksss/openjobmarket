import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Cookie, Shield, BarChart3, Settings, Globe } from "lucide-react"

export default function CookiesPage() {
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
          <CardTitle className="text-3xl">🍪 Cookies Policy</CardTitle>
          <p className="text-muted-foreground">Effective Date: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-blue-800">
              Open Job Market Ltd ("we", "our", "us") operates the website{" "}
              <strong>www.openjobmarket.com</strong> (the "Platform").
              This Cookies Policy explains how we use cookies and similar technologies.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Cookie className="h-5 w-5 mr-2 text-orange-600" />
              1. What Are Cookies?
            </h2>
            <p className="mb-3">Cookies are small text files placed on your device when you visit our Platform. They help us:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Recognise your device</li>
              <li>Remember your preferences</li>
              <li>Improve performance and security</li>
              <li>Provide analytics and insights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Types of Cookies We Use</h2>

            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  a) Strictly Necessary Cookies
                </h3>
                <p className="text-red-700 mb-2">These cookies are essential for the Platform to function, such as:</p>
                <ul className="list-disc pl-6 space-y-1 text-red-700">
                  <li>Logging into your account</li>
                  <li>Security and fraud prevention</li>
                  <li>Saving cookie preferences</li>
                </ul>
                <div className="bg-red-100 border border-red-200 p-2 rounded mt-3">
                  <p className="text-red-800 font-semibold text-sm">📌 You cannot disable these cookies.</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  b) Performance & Analytics Cookies
                </h3>
                <p className="text-blue-700 mb-2">These cookies help us understand how users interact with the Platform, so we can improve it.</p>
                <p className="text-blue-700 mb-2"><strong>Example:</strong> pages visited, clicks, time spent</p>
                <div className="bg-blue-100 border border-blue-200 p-2 rounded mt-3">
                  <p className="text-blue-800 font-semibold text-sm">📌 We use privacy-friendly analytics through Supabase or third-party providers.</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  c) Functional Cookies
                </h3>
                <p className="text-green-700">These cookies store your preferences (e.g., language, profile settings).</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  d) Advertising Cookies (Future Use)
                </h3>
                <p className="text-purple-700 mb-2">If we introduce advertising or paid features in the future, we may use cookies to:</p>
                <ul className="list-disc pl-6 space-y-1 text-purple-700">
                  <li>Show relevant ads</li>
                  <li>Measure ad performance</li>
                </ul>
                <div className="bg-purple-100 border border-purple-200 p-2 rounded mt-3">
                  <p className="text-purple-800 font-semibold text-sm">Currently, we do not use advertising cookies.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Third-Party Cookies</h2>
            <p className="mb-3">Some cookies may be placed by trusted third parties, such as:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase</strong> (for secure authentication and data storage)</li>
              <li><strong>Payment providers</strong> (for future billing features)</li>
              <li><strong>Analytics services</strong> (if we integrate external tools)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Your Cookie Choices</h2>
            <p className="mb-3">When you first visit the Platform, you will see a cookie consent banner. You can:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="list-disc pl-6 space-y-1">
                <li>Accept all cookies</li>
                <li>Reject non-essential cookies</li>
                <li>Manage your preferences</li>
              </ul>
            </div>

            <p className="mt-4 mb-3">You can also change your settings at any time in your browser:</p>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded text-center">
                <p className="font-semibold text-blue-800">Chrome</p>
                <p className="text-sm text-blue-700">Settings &gt; Privacy and security &gt; Cookies</p>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center">
                <p className="font-semibold text-gray-800">Safari</p>
                <p className="text-sm text-gray-700">Preferences &gt; Privacy</p>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <p className="font-semibold text-orange-800">Firefox</p>
                <p className="text-sm text-orange-700">Options &gt; Privacy &amp; Security</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. How Long Do Cookies Last?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Session cookies</h3>
                <p className="text-yellow-700">Deleted when you close your browser</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-semibold text-indigo-800 mb-2">Persistent cookies</h3>
                <p className="text-indigo-700">Remain until they expire or you delete them</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Updates to This Policy</h2>
            <p>
              We may update this Cookies Policy from time to time. Any changes will be posted on this page with an updated "Effective Date".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>If you have any questions about this Cookies Policy:</p>
              <div className="mt-2 space-y-1">
                <p>📧 <a href="mailto:soneksss@gmail.com" className="text-primary hover:underline">soneksss@gmail.com</a></p>
                <p>🏢 Open Job Market Ltd, United Kingdom</p>
              </div>
            </div>
          </section>

          <div className="border-t pt-6 mt-8">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
