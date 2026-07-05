"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-2xl flex-1 flex flex-col">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="h-4 w-4" />Back to Open Job Market
        </Link>

        <div
          className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-8 sm:p-10 shadow-2xl"
          style={{ animation: "fadeIn 0.4s ease both" }}
        >
          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              💚 Open Job Market is currently <span className="text-emerald-400">FREE</span>
            </h1>
          </div>

          {/* Body */}
          <div className="space-y-4 text-slate-300 text-[15px] leading-relaxed">
            <p>
              We're focused on building the best platform for homeowners and local tradespeople.
            </p>
            <p>
              There are currently <strong className="text-white">no subscription fees, hidden costs or paid plans.</strong>
            </p>
            <p>
              If, in a year or two, Open Job Market proves genuinely valuable and helps thousands of people, we may introduce a small subscription of around <strong className="text-white">£10 per month</strong> simply to help cover running costs and continue improving the platform.
            </p>

            <div className="pt-2">
              <p className="font-semibold text-white mb-3">Our promise is simple:</p>
              <ul className="space-y-2.5">
                {[
                  "No lead selling",
                  "No surprise charges",
                  "No unnecessary subscriptions",
                  "We'll only ever charge if the platform provides real value.",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-sm text-slate-400 leading-relaxed">
            Thank you for supporting an independent platform built to make finding trusted local tradespeople easier and fairer.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
