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

  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

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
        { q: t('help.howFindJobs'), a: t('help.howFindJobsAnswer') },
        { q: t('help.canApplyAnonymously'), a: t('help.canApplyAnonymouslyAnswer') },
        { q: t('help.howSaveJobs'), a: t('help.howSaveJobsAnswer') }
      ]
    },
    {
      category: t('help.forEmployers'),
      questions: [
        { q: t('help.howPostJob'), a: t('help.howPostJobAnswer') },
        { q: t('help.canSeeApplicants'), a: t('help.canSeeApplicantsAnswer') },
        { q: t('help.howContactCandidates'), a: t('help.howContactCandidatesAnswer') }
      ]
    },
    {
      category: t('help.forTradespeopleHomeowners'),
      questions: [
        { q: t('help.howFindTradesperson'), a: t('help.howFindTradespersonAnswer') },
        { q: t('help.howOfferServices'), a: t('help.howOfferServicesAnswer') },
        { q: t('help.isVerified'), a: t('help.isVerifiedAnswer') }
      ]
    },
    {
      category: t('help.accountPrivacy'),
      questions: [
        { q: t('help.howDeleteAccount'), a: t('help.howDeleteAccountAnswer') },
        { q: t('help.howChangeEmail'), a: t('help.howChangeEmailAnswer') },
        { q: t('help.whoSeesData'), a: t('help.whoSeesDataAnswer') }
      ]
    },
    {
      category: t('help.paymentsBilling'),
      questions: [
        { q: t('help.costToPost'), a: t('help.costToPostAnswer') },
        { q: t('help.premiumFeatures'), a: t('help.premiumFeaturesAnswer') },
        { q: t('help.refundPolicy'), a: t('help.refundPolicyAnswer') }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 py-16 md:py-20 relative">
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

      {/* FAQ Content */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          {faqCategories.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">{category.category}</h2>
              </div>
              <div className="p-6 space-y-4">
                {category.questions.map((faq, qIndex) => {
                  const faqId = catIndex * 100 + qIndex
                  const isExpanded = expandedFAQ === faqId

                  return (
                    <div key={qIndex} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                      <button
                        onClick={() => setExpandedFAQ(isExpanded ? null : faqId)}
                        className="w-full flex items-center justify-between text-left py-2 hover:text-blue-600 transition-colors"
                      >
                        <span className="font-semibold text-lg pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`h-5 w-5 flex-shrink-0 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="mt-2 text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Mail className="h-16 w-16 mx-auto text-blue-300" />
            <h2 className="text-3xl md:text-4xl font-bold">
              Still need help?
            </h2>
            <p className="text-xl text-blue-100">
              Our support team is here to assist you
            </p>
            <div className="pt-6">
              <Link href={getLocalePath("/contact")}>
                <Button
                  size="lg"
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-lg px-8 py-6"
                >
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
