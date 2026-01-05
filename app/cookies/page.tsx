"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Cookie } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function CookiesPage() {
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
          {t('cookies.backToHome')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Cookie className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">{t('cookies.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('cookies.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('cookies.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They are widely
              used to make websites work more efficiently and provide information to website owners.
            </p>
            <p className="mt-3">
              This Cookie Policy explains how OpenJobMarket uses cookies and similar tracking technologies on our
              Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Strictly Necessary Cookies</h3>
            <p>
              These cookies are essential for the Platform to function properly. They enable core functionality
              such as security, network management, and accessibility.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Examples:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Authentication cookies (keep you logged in)</li>
                <li>Security cookies (protect against fraud)</li>
                <li>Session cookies (maintain your session state)</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duration:</strong> Session or up to 1 year</p>
              <p className="text-sm"><strong>Can be disabled:</strong> No (required for Platform operation)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Performance and Analytics Cookies</h3>
            <p>
              These cookies collect information about how you use our Platform, such as which pages you visit
              most often. This helps us improve Platform performance and user experience.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Examples:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Google Analytics (aggregated usage statistics)</li>
                <li>Page load performance tracking</li>
                <li>Error tracking and debugging</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duration:</strong> Up to 2 years</p>
              <p className="text-sm"><strong>Can be disabled:</strong> Yes (through cookie preferences)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Functionality Cookies</h3>
            <p>
              These cookies allow the Platform to remember choices you make (such as your language preference,
              location, or display settings) and provide enhanced, personalized features.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Examples:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Language preference cookies</li>
                <li>Location preference cookies</li>
                <li>Dark mode/theme preferences</li>
                <li>Search filter preferences</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duration:</strong> Up to 1 year</p>
              <p className="text-sm"><strong>Can be disabled:</strong> Yes (may affect user experience)</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Targeting/Advertising Cookies</h3>
            <p>
              These cookies are used to deliver advertisements more relevant to you and your interests. They may
              also be used to limit the number of times you see an advertisement and measure the effectiveness
              of advertising campaigns.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">Examples:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Advertising network cookies</li>
                <li>Remarketing cookies</li>
                <li>Social media advertising pixels</li>
              </ul>
              <p className="mt-3 text-sm"><strong>Duration:</strong> Up to 2 years</p>
              <p className="text-sm"><strong>Can be disabled:</strong> Yes (through cookie preferences)</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Third-Party Cookies</h2>
            <p>
              We use services from trusted third-party providers that may set cookies on your device. These
              include:
            </p>

            <div className="space-y-4 mt-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Google Analytics</p>
                <p className="text-sm mt-1">
                  Used to analyze Platform usage and improve services.
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Stripe (Payment Processing)</p>
                <p className="text-sm mt-1">
                  Used for secure payment processing.
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Supabase (Backend Services)</p>
                <p className="text-sm mt-1">
                  Used for authentication and data storage.
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Vercel (Hosting)</p>
                <p className="text-sm mt-1">
                  Used for Platform hosting and performance.
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Authentication:</strong> To keep you logged in and verify your identity</li>
              <li><strong>Security:</strong> To detect and prevent fraudulent activity</li>
              <li><strong>Preferences:</strong> To remember your settings and preferences</li>
              <li><strong>Analytics:</strong> To understand how users interact with our Platform</li>
              <li><strong>Performance:</strong> To improve Platform speed and functionality</li>
              <li><strong>Marketing:</strong> To deliver relevant advertisements (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Managing Cookie Preferences</h2>

            <h3 className="text-xl font-semibold mb-3">5.1 Cookie Consent Banner</h3>
            <p>
              When you first visit OpenJobMarket, you'll see a cookie consent banner. You can accept all cookies,
              reject non-essential cookies, or customize your preferences.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Delete all cookies from your browser</li>
              <li>Block all cookies</li>
              <li>Block third-party cookies only</li>
              <li>Get notified when a website sets a cookie</li>
            </ul>

            <p className="mt-4">
              <strong>Browser-specific instructions:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Opt-Out Tools</h3>
            <p>You can also use these opt-out tools:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Analytics Opt-out Browser Add-on</a></li>
              <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Digital Advertising Alliance Opt-Out</a></li>
              <li><a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Your Online Choices (EU)</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Impact of Disabling Cookies</h2>
            <p>
              If you disable cookies, some features of the Platform may not function properly:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>You may need to log in each time you visit</li>
              <li>Your preferences won't be saved</li>
              <li>Some features may not be available</li>
              <li>The Platform may load more slowly</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Strictly necessary cookies cannot be disabled as they are essential for
              Platform operation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Other Tracking Technologies</h2>
            <p>In addition to cookies, we may use:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.1 Web Beacons (Pixels)</h3>
            <p>
              Small graphic images embedded in web pages or emails to track user behavior and measure campaign
              effectiveness.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Local Storage</h3>
            <p>
              Browser storage mechanism that allows websites to store data locally on your device for improved
              performance and offline functionality.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.3 Session Storage</h3>
            <p>
              Temporary storage that is cleared when you close your browser tab, used for short-term data
              like form inputs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Updates to Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for
              legal, operational, or regulatory reasons. We will notify you of significant changes by updating
              the "Last Updated" date at the top of this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Your Rights</h2>
            <p>
              Under GDPR and other data protection laws, you have rights regarding cookies and tracking:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Right to be informed about cookie use</li>
              <li>Right to accept or reject non-essential cookies</li>
              <li>Right to change cookie preferences at any time</li>
              <li>Right to withdraw consent for cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <p>
              If you have questions about our use of cookies or this Cookie Policy, please contact us at:
            </p>
            <p className="mt-2">
              Email: info@openjobmarket.com<br />
              Address: OpenJobMarket, London, United Kingdom
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Cookie Preferences:</strong> You can change your cookie preferences at any time through
              your browser settings or by contacting us directly. We respect your privacy choices.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
