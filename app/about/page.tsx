import { generateSEO } from "@/lib/seo"
import Link from "next/link"

export const metadata = generateSEO({
  title: 'About Open Job Market - Connecting Homeowners with Tradespeople',
  description: 'Open Job Market connects homeowners with trusted local tradespeople in seconds. Find plumbers, electricians, builders and more — fast, local, and on-demand.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A faster, smarter way to find local tradespeople.
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto">
            Post a job, get applications from nearby professionals, and hire with confidence — all in minutes.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors"
            >
              Browse Tradespeople
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">

        {/* Comparison */}
        <div>
          <h2 className="text-2xl font-bold text-center text-white mb-6">
            Why Homeowners Choose Open Job Market
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Other platforms */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-base font-semibold text-slate-400 mb-4">Other platforms</h3>
              <ul className="space-y-2.5">
                {[
                  "Sell your request as paid leads",
                  "Multiple unwanted sales calls",
                  "Often matched with non-local companies",
                  "Slow quote process",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-500">
                    <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">✕</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Open Job Market */}
            <div className="bg-emerald-950/40 rounded-xl border border-emerald-500/30 p-5">
              <h3 className="text-base font-semibold text-emerald-400 mb-4">Open Job Market</h3>
              <ul className="space-y-2.5">
                {[
                  "No lead selling — fairer prices",
                  "Connect directly with nearby tradespeople",
                  "Message only — no spam calls",
                  "Uber-style for urgent jobs, Airbnb-style for flexible work",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* For each audience */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-slate-800 rounded-xl border border-orange-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl">🔧</span>
                <h3 className="text-base font-bold text-white">For Tradespeople</h3>
              </div>
              <p className="text-orange-100 text-xs">More local jobs, less downtime.</p>
            </div>
            <ul className="p-5 space-y-2.5">
              {[
                "See nearby jobs on an interactive map",
                "Apply instantly — no waiting around",
                "Get found by homeowners searching your trade",
                "Fill schedule gaps with local work",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800 rounded-xl border border-blue-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-5 py-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl">🏠</span>
                <h3 className="text-base font-bold text-white">For Homeowners</h3>
              </div>
              <p className="text-blue-100 text-xs">Find the right person, fast.</p>
            </div>
            <ul className="p-5 space-y-2.5">
              {[
                "Post a job with photos, description & budget",
                "Reach tradespeople near your location instantly",
                "Receive and compare applications side by side",
                "Hire with confidence — reviews included",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-800 rounded-xl border border-emerald-700/30 p-7 text-center">
          <p className="text-lg font-semibold text-white mb-1">Ready to get started?</p>
          <p className="text-sm text-slate-400 mb-5">Join thousands of homeowners and tradespeople already using Open Job Market.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors"
            >
              Search Tradespeople
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
