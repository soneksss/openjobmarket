'use client'

import { useState } from "react"
import { ChevronDown, Mail, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const FAQ_CATEGORIES = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is Open Job Market?",
        a: "Open Job Market is a map-based platform that connects homeowners with nearby tradespeople. Instead of browsing directories and waiting days for replies, it works like an Uber-style system — helping you find the nearest available professional fast.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' in the top right corner. Choose your account type (Homeowner or Tradesperson), enter your details, and verify your email. The whole process takes under 2 minutes.",
      },
      {
        q: "Is it free to use?",
        a: "Homeowners can post jobs and receive applications for free. Tradespeople can browse and apply to local jobs. No subscription is required for the first 6 months.",
      },
    ],
  },
  {
    category: "For Tradespeople",
    questions: [
      {
        q: "How do I find jobs near me?",
        a: "Once registered, you can see jobs posted in your area directly on the interactive map. Jobs are matched by proximity — the closer you are, the higher you appear in the homeowner's results.",
      },
      {
        q: "How do I apply for a job?",
        a: "Open a job listing and click 'Apply'. You can include a message and your availability. For urgent (ASAP) jobs, you'll receive a notification and have a limited window to respond.",
      },
      {
        q: "How does urgency work?",
        a: "Homeowners choose urgency when posting: ASAP (respond within 1 hour), Today (same day), or Flexible (1–7 days). Urgent jobs are dispatched to the nearest available tradespeople first — similar to how Uber assigns drivers.",
      },
      {
        q: "How do I get more visibility?",
        a: "Keep your profile complete with your trade, location, and a profile photo. Tradespeople with complete profiles appear higher in search results and are more likely to receive urgent job notifications.",
      },
    ],
  },
  {
    category: "For Homeowners",
    questions: [
      {
        q: "How do I post a job?",
        a: "Click 'Post a Job', describe the work needed (trade, description, optional budget and photo), choose how urgently you need it done, and pin your location on the map. Tradespeople in your area will be notified instantly.",
      },
      {
        q: "How quickly can I get someone?",
        a: "For ASAP jobs, you can receive responses within minutes. Today jobs typically get responses within a few hours. Flexible jobs stay listed for up to 7 days.",
      },
      {
        q: "How do I choose the right tradesperson?",
        a: "Once applications come in, you can view each tradesperson's profile, trade, location, and any message they included. You can then message them directly through the platform to discuss the job.",
      },
      {
        q: "Is there a limit on how many jobs I can post?",
        a: "During the no-subscription period, you can post jobs freely. Each job listing expires based on the urgency level you selected when posting.",
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
        a: "Your data is stored securely and never sold to third parties. We use industry-standard encryption and authentication. You can request a copy or deletion of your data at any time.",
      },
      {
        q: "Can I update my location?",
        a: "Yes. Go to your profile settings and update your address. Your location is used to match you with nearby jobs or tradespeople — keeping it accurate improves your results.",
      },
    ],
  },
]

export default function HelpPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Help & FAQ</h1>
            <p className="text-xl text-blue-100">
              Everything you need to know about Open Job Market.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {FAQ_CATEGORIES.map((category, catIdx) => (
            <div key={catIdx} className="bg-white rounded-2xl shadow-md border-b-4 border-blue-600 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                {category.category}
              </h2>
              <div className="space-y-2">
                {category.questions.map((faq, faqIdx) => {
                  const uid = catIdx * 100 + faqIdx
                  return (
                    <div key={faqIdx} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === uid ? null : uid)}
                        className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-gray-800 pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${
                            expandedFAQ === uid ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedFAQ === uid && (
                        <div className="px-4 pb-4 pt-3 text-gray-700 leading-relaxed border-t bg-blue-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Contact Support */}
          <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Still have questions?</h3>
            <p className="text-gray-700 mb-6">
              Our support team is here to help. Send us a message and we'll get back to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/contact" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:info@openjobmarket.com" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  info@openjobmarket.com
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
