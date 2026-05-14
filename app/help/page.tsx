'use client'

import { useState } from "react"
import { ChevronDown, Mail, MessageCircle, HelpCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

const FAQ_CATEGORIES = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is Open Job Market?",
        a: "Open Job Market is a map-based platform that connects homeowners with nearby tradespeople. Instead of browsing directories and waiting days for replies, it works like an Uber-style system — helping you find the nearest available tradesperson fast.",
      },
      {
        q: "What account types are available?",
        a: "There are two account types: Homeowner (post trade jobs and find local tradespeople) and Tradesperson / Company (browse local jobs, apply, and get found by homeowners). Choose the one that fits your needs when signing up.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' in the top right corner. Choose your account type, enter your details, and verify your email. The whole process takes under 2 minutes.",
      },
      {
        q: "Is it free to use?",
        a: "Homeowners can post trade jobs and receive applications for free. Tradespeople can browse and apply to local jobs. A premium subscription unlocks additional features for tradespeople.",
      },
    ],
  },
  {
    category: "Find Jobs",
    questions: [
      {
        q: "How do I find jobs near me?",
        a: "Once registered and your location is set, you can see trade jobs posted in your area on the interactive map. Jobs are matched by proximity — the closer you are, the higher you appear in the homeowner's results.",
      },
      {
        q: "How do I apply for a job?",
        a: "Open a job listing and click 'Apply'. You can include a message and your availability. Once a homeowner selects applicants, they'll contact you directly through the platform.",
      },
      {
        q: "How does job urgency work?",
        a: "Homeowners set urgency when posting: ASAP (respond within 1 hour), Today (same day), or Flexible (1–7 days). Urgent jobs are sent to the nearest available tradespeople first — similar to how Uber assigns drivers.",
      },
      {
        q: "How do I get more visibility?",
        a: "Keep your profile complete with your trade type, service area, location, and a profile photo. Complete profiles appear higher in search results and are prioritised for urgent job notifications.",
      },
      {
        q: "How many jobs can I apply for?",
        a: "On the free plan, you can apply to a limited number of jobs per month. Upgrading to Premium removes this limit and gives you priority placement in homeowner search results.",
      },
    ],
  },
  {
    category: "Find a Tradesperson",
    questions: [
      {
        q: "How do I post a trade job?",
        a: "Click 'Post a Job', describe the work needed (trade type, description, optional budget and photo), choose how urgently you need it done, and pin your location on the map. Tradespeople in your area are notified instantly.",
      },
      {
        q: "What types of jobs can I post?",
        a: "Any home trade or repair work — plumbing, electrical, carpentry, decorating, roofing, landscaping, and more. Jobs must be genuine trade work at a residential or commercial property.",
      },
      {
        q: "How quickly can I get someone?",
        a: "For ASAP jobs, you can receive responses within minutes. Today jobs typically get responses within a few hours. Flexible jobs stay listed for up to 7 days.",
      },
      {
        q: "How do I choose the right tradesperson?",
        a: "Once applications come in, you can view each tradesperson's profile, trade, location, ratings, and their message. You can then message them directly through the platform to discuss the job before deciding.",
      },
      {
        q: "Is there a limit on how many jobs I can post?",
        a: "Homeowners can post jobs freely. Each job listing expires based on the urgency level you selected when posting. You can re-post a job at any time.",
      },
    ],
  },
  {
    category: "Account & Privacy",
    questions: [
      {
        q: "How do I delete my account?",
        a: "Go to Account Settings and scroll to the bottom. Click 'Delete Account'. This permanently removes your profile, jobs, and all associated data. This action cannot be undone.",
      },
      {
        q: "How is my data protected?",
        a: "Your data is stored securely and never sold to third parties. We use industry-standard encryption and authentication. You can request a copy or deletion of your data at any time via our Privacy Policy.",
      },
      {
        q: "Can I update my location?",
        a: "Yes. Go to your profile settings and update your address or service area. Keeping your location accurate improves your match quality — whether you're a homeowner finding trades or a tradesperson finding work.",
      },
      {
        q: "Who can see my profile?",
        a: "Tradesperson / Company profiles are publicly visible so homeowners can find and review them. Homeowner profiles are private — only the jobs they post are visible to tradespeople.",
      },
    ],
  },
  {
    category: "Messaging & Applications",
    questions: [
      {
        q: "How does messaging work?",
        a: "Once a tradesperson applies and a homeowner shows interest, both parties can message each other directly within the platform. No personal contact details are shared until you both agree.",
      },
      {
        q: "Can I withdraw an application?",
        a: "Yes. Go to your dashboard under 'My Applications' and withdraw any pending application. Once withdrawn, the homeowner will no longer see your application.",
      },
      {
        q: "How do I know if a homeowner is interested?",
        a: "You'll receive a notification when a homeowner views your profile or sends you a message in response to your application.",
      },
    ],
  },
]

export default function HelpPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header with back button */}
      <div className="bg-slate-800 border-b border-slate-700/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard/homeowner"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-white">Help & FAQ</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Help & FAQ</h1>
          <p className="text-slate-300">Everything you need to know about Open Job Market.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-5">
        {FAQ_CATEGORIES.map((category, catIdx) => (
          <div key={catIdx} className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
              {category.category}
            </h2>
            <div className="space-y-1">
              {category.questions.map((faq, faqIdx) => {
                const uid = catIdx * 100 + faqIdx
                const isOpen = expandedFAQ === uid
                return (
                  <div key={faqIdx} className="rounded-lg overflow-hidden border border-slate-700/50">
                    <button
                      onClick={() => setExpandedFAQ(isOpen ? null : uid)}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-700/40 transition-colors"
                    >
                      <span className="font-medium text-slate-200 text-sm">{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 text-sm text-slate-400 leading-relaxed border-t border-slate-700/50 bg-slate-700/20">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Still have questions */}
        <div className="bg-gradient-to-br from-blue-950 to-slate-800 rounded-xl border border-blue-800/40 p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Still have questions?</h3>
          <p className="text-slate-400 text-sm mb-5">
            Our support team is here to help. Send us a message and we'll get back to you as soon as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
