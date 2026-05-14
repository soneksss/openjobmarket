"use client"

import Link from "next/link"
import { ArrowLeft, Cookie } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function CookiesPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={getLocalePath("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />{t('cookies.backToHome')}
        </Link>

        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Cookie className="h-7 w-7 text-emerald-400 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">{t('cookies.title')}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{t('cookies.subtitle')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-8">
            {t('cookies.lastUpdated')}: {new Date().toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
          </p>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. What Are Cookies?</h2>
              <p>Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.</p>
              <p className="mt-2">This Cookie Policy explains how OpenJobMarket uses cookies and similar tracking technologies on our Platform.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Types of Cookies We Use</h2>

              <h3 className="font-semibold text-slate-200 mb-1">2.1 Strictly Necessary Cookies</h3>
              <p className="mb-2">These cookies are essential for the Platform to function properly. They enable core functionality such as security, network management, and accessibility.</p>
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                <p className="font-semibold text-slate-200 mb-2">Examples:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Authentication cookies (keep you logged in)</li>
                  <li>Security cookies (protect against fraud)</li>
                  <li>Session cookies (maintain your session state)</li>
                </ul>
                <p className="mt-3 text-slate-400"><strong className="text-slate-300">Duration:</strong> Session or up to 1 year</p>
                <p className="text-slate-400"><strong className="text-slate-300">Can be disabled:</strong> No (required for Platform operation)</p>
              </div>

              <h3 className="font-semibold text-slate-200 mt-4 mb-1">2.2 Performance and Analytics Cookies</h3>
              <p className="mb-2">These cookies collect information about how you use our Platform, such as which pages you visit most often. This helps us improve Platform performance and user experience.</p>
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                <p className="font-semibold text-slate-200 mb-2">Examples:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Google Analytics (aggregated usage statistics)</li>
                  <li>Page load performance tracking</li>
                  <li>Error tracking and debugging</li>
                </ul>
                <p className="mt-3 text-slate-400"><strong className="text-slate-300">Duration:</strong> Up to 2 years</p>
                <p className="text-slate-400"><strong className="text-slate-300">Can be disabled:</strong> Yes (through cookie preferences)</p>
              </div>

              <h3 className="font-semibold text-slate-200 mt-4 mb-1">2.3 Functionality Cookies</h3>
              <p className="mb-2">These cookies allow the Platform to remember choices you make (such as your language preference, location, or display settings) and provide enhanced, personalised features.</p>
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                <p className="font-semibold text-slate-200 mb-2">Examples:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Language preference cookies</li>
                  <li>Location preference cookies</li>
                  <li>Dark mode/theme preferences</li>
                  <li>Search filter preferences</li>
                </ul>
                <p className="mt-3 text-slate-400"><strong className="text-slate-300">Duration:</strong> Up to 1 year</p>
                <p className="text-slate-400"><strong className="text-slate-300">Can be disabled:</strong> Yes (may affect user experience)</p>
              </div>

              <h3 className="font-semibold text-slate-200 mt-4 mb-1">2.4 Targeting / Advertising Cookies</h3>
              <p className="mb-2">These cookies are used to deliver advertisements more relevant to you and your interests. They may also limit the number of times you see an advertisement and measure campaign effectiveness.</p>
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                <p className="font-semibold text-slate-200 mb-2">Examples:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Advertising network cookies</li>
                  <li>Remarketing cookies</li>
                  <li>Social media advertising pixels</li>
                </ul>
                <p className="mt-3 text-slate-400"><strong className="text-slate-300">Duration:</strong> Up to 2 years</p>
                <p className="text-slate-400"><strong className="text-slate-300">Can be disabled:</strong> Yes (through cookie preferences)</p>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. Third-Party Cookies</h2>
              <p className="mb-3">We use services from trusted third-party providers that may set cookies on your device:</p>
              <div className="space-y-3">
                {[
                  { name: "Google Analytics", desc: "Used to analyse Platform usage and improve services." },
                  { name: "Stripe (Payment Processing)", desc: "Used for secure payment processing." },
                  { name: "Supabase (Backend Services)", desc: "Used for authentication and data storage." },
                  { name: "Vercel (Hosting)", desc: "Used for Platform hosting and performance." },
                ].map(({ name, desc }) => (
                  <div key={name} className="border-l-2 border-emerald-600/50 pl-4">
                    <p className="font-semibold text-slate-200">{name}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. How We Use Cookies</h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Authentication:</strong> To keep you logged in and verify your identity</li>
                <li><strong className="text-slate-200">Security:</strong> To detect and prevent fraudulent activity</li>
                <li><strong className="text-slate-200">Preferences:</strong> To remember your settings and preferences</li>
                <li><strong className="text-slate-200">Analytics:</strong> To understand how users interact with our Platform</li>
                <li><strong className="text-slate-200">Performance:</strong> To improve Platform speed and functionality</li>
                <li><strong className="text-slate-200">Marketing:</strong> To deliver relevant advertisements (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Managing Cookie Preferences</h2>
              <h3 className="font-semibold text-slate-200 mb-1">5.1 Cookie Consent Banner</h3>
              <p>When you first visit OpenJobMarket, you'll see a cookie consent banner. You can accept all cookies, reject non-essential cookies, or customise your preferences.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">5.2 Browser Settings</h3>
              <p className="mb-2">Most web browsers allow you to control cookies through their settings. You can delete all cookies, block all cookies, block third-party cookies only, or get notified when a website sets a cookie.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">5.3 Opt-Out Tools</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">Google Analytics Opt-out Browser Add-on</a></li>
                <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">Digital Advertising Alliance Opt-Out</a></li>
                <li><a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">Your Online Choices (EU)</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">6. Impact of Disabling Cookies</h2>
              <p className="mb-2">If you disable cookies, some features of the Platform may not function properly:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>You may need to log in each time you visit</li>
                <li>Your preferences won't be saved</li>
                <li>Some features may not be available</li>
                <li>The Platform may load more slowly</li>
              </ul>
              <p className="mt-2">Strictly necessary cookies cannot be disabled as they are essential for Platform operation.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">7. Other Tracking Technologies</h2>
              <h3 className="font-semibold text-slate-200 mb-1">7.1 Web Beacons (Pixels)</h3>
              <p>Small graphic images embedded in web pages or emails to track user behaviour and measure campaign effectiveness.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">7.2 Local Storage</h3>
              <p>Browser storage mechanism that allows websites to store data locally on your device for improved performance and offline functionality.</p>
              <h3 className="font-semibold text-slate-200 mt-3 mb-1">7.3 Session Storage</h3>
              <p>Temporary storage that is cleared when you close your browser tab, used for short-term data like form inputs.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">8. Updates to Cookie Policy</h2>
              <p>We may update this Cookie Policy from time to time. We will notify you of significant changes by updating the "Last Updated" date at the top of this policy.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">9. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Right to be informed about cookie use</li>
                <li>Right to accept or reject non-essential cookies</li>
                <li>Right to change cookie preferences at any time</li>
                <li>Right to withdraw consent for cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">10. Contact Us</h2>
              <p>If you have questions about our use of cookies or this Cookie Policy:</p>
              <p className="mt-2 text-slate-400">
                Use our <a href="/contact" className="text-emerald-400 hover:text-emerald-300">contact form</a>.<br />
                Address: OpenJobMarket, London, United Kingdom
              </p>
            </section>

            <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-300">
              <strong>Cookie Preferences:</strong> You can change your cookie preferences at any time through your browser settings or by contacting us directly. We respect your privacy choices.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
