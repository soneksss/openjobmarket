'use client'

import { useState } from "react"
import { ChevronDown, Mail } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HelpPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  // FAQ categories and questions from translation
  const faqCategories = [
    {
      category: t('help.gettingStarted'),
      questions: [
        { q: t('help.howCreateAccount'), a: t('help.howCreateAccountAnswer') },
        { q: t('help.isFree'), a: t('help.isFreeAnswer') },
        { q: t('help.canUseAnonymously'), a: t('help.canUseAnonymouslyAnswer') }
      ]
    },
    {
      category: t('help.forJobSeekers'),
      questions: [
        { q: t('help.howSearchJobs'), a: t('help.howSearchJobsAnswer') },
        { q: t('help.howEmployersFind'), a: t('help.howEmployersFindAnswer') },
        { q: t('help.applyWithoutProfile'), a: t('help.applyWithoutProfileAnswer') }
      ]
    },
    {
      category: t('help.forEmployers'),
      questions: [
        { q: t('help.howPostJob'), a: t('help.howPostJobAnswer') },
        { q: t('help.howFindCandidates'), a: t('help.howFindCandidatesAnswer') },
        { q: t('help.subscriptionPlans'), a: t('help.subscriptionPlansAnswer') }
      ]
    },
    {
      category: t('help.forTradespeopleHomeowners'),
      questions: [
        { q: t('help.howTradespeopleHired'), a: t('help.howTradespeopleHiredAnswer') },
        { q: t('help.howHomeownersHire'), a: t('help.howHomeownersHireAnswer') },
        { q: t('help.areTradespeopleVerified'), a: t('help.areTradespeopleVerifiedAnswer') }
      ]
    },
    {
      category: t('help.accountPrivacy'),
      questions: [
        { q: t('help.howDeleteAccount'), a: t('help.howDeleteAccountAnswer') },
        { q: t('help.howDataProtected'), a: t('help.howDataProtectedAnswer') },
        { q: t('help.hideProfileCompanies'), a: t('help.hideProfileCompaniesAnswer') }
      ]
    },
    {
      category: t('help.paymentsBilling'),
      questions: [
        { q: t('help.paymentMethods'), a: t('help.paymentMethodsAnswer') },
        { q: t('help.cancelSubscription'), a: t('help.cancelSubscriptionAnswer') },
        { q: t('help.refunds'), a: t('help.refundsAnswer') }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {t('help.title')}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light">
              {t('help.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border-b-4 border-blue-600">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  {category.category}
                </h2>
                <div className="space-y-3">
                  {category.questions.map((faq, faqIndex) => {
                    const uniqueIndex = categoryIndex * 100 + faqIndex
                    return (
                      <div key={faqIndex} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFAQ(expandedFAQ === uniqueIndex ? null : uniqueIndex)}
                          className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-gray-800 pr-4">{faq.q}</span>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${
                              expandedFAQ === uniqueIndex ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expandedFAQ === uniqueIndex && (
                          <div className="px-4 pb-4 text-gray-700 leading-relaxed border-t bg-blue-50/50">
                            <p className="pt-4">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Support Section */}
          <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">{t('help.stillHaveQuestions')}</h3>
            <p className="text-gray-700 mb-6 text-lg">{t('help.supportTeamHelp')}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <a href="mailto:support@openjobmarket.com" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('help.contactSupport')}
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href={getLocalePath("/contact")}>
                  {t('help.reportBug')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
