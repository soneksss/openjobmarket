'use client'

import { Users, Building2, Wrench, Home } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function UsefulInfoPage() {
  const { t } = useTranslation()

  const sections = [
    {
      id: 'jobseekers',
      icon: Users,
      title: t('usefulInfo.forJobseekers'),
      subtitle: t('usefulInfo.findingJobsTips'),
      color: 'blue',
      questions: [
        { q: t('usefulInfo.jobseekersQ1'), a: t('usefulInfo.jobseekersA1') },
        { q: t('usefulInfo.jobseekersQ2'), a: t('usefulInfo.jobseekersA2') },
        { q: t('usefulInfo.jobseekersQ3'), a: t('usefulInfo.jobseekersA3') },
        { q: t('usefulInfo.jobseekersQ4'), a: t('usefulInfo.jobseekersA4') },
        { q: t('usefulInfo.jobseekersQ5'), a: t('usefulInfo.jobseekersA5') },
        { q: t('usefulInfo.jobseekersQ6'), a: t('usefulInfo.jobseekersA6') }
      ]
    },
    {
      id: 'employers',
      icon: Building2,
      title: t('usefulInfo.forEmployers'),
      subtitle: t('usefulInfo.hiringLaw'),
      color: 'green',
      questions: [
        { q: t('usefulInfo.employersQ1'), a: t('usefulInfo.employersA1') },
        { q: t('usefulInfo.employersQ2'), a: t('usefulInfo.employersA2') },
        { q: t('usefulInfo.employersQ3'), a: t('usefulInfo.employersA3') },
        { q: t('usefulInfo.employersQ4'), a: t('usefulInfo.employersA4') },
        { q: t('usefulInfo.employersQ5'), a: t('usefulInfo.employersA5') },
        { q: t('usefulInfo.employersQ6'), a: t('usefulInfo.employersA6') }
      ]
    },
    {
      id: 'tradespeople',
      icon: Wrench,
      title: t('usefulInfo.forTradespeople'),
      subtitle: t('usefulInfo.gettingWork'),
      color: 'purple',
      questions: [
        { q: t('usefulInfo.tradespeopleQ1'), a: t('usefulInfo.tradespeopleA1') },
        { q: t('usefulInfo.tradespeopleQ2'), a: t('usefulInfo.tradespeopleA2') },
        { q: t('usefulInfo.tradespeopleQ3'), a: t('usefulInfo.tradespeopleA3') },
        { q: t('usefulInfo.tradespeopleQ4'), a: t('usefulInfo.tradespeopleA4') },
        { q: t('usefulInfo.tradespeopleQ5'), a: t('usefulInfo.tradespeopleA5') },
        { q: t('usefulInfo.tradespeopleQ6'), a: t('usefulInfo.tradespeopleA6') }
      ]
    },
    {
      id: 'homeowners',
      icon: Home,
      title: t('usefulInfo.forHomeowners'),
      subtitle: t('usefulInfo.hiringSafely'),
      color: 'orange',
      questions: [
        { q: t('usefulInfo.homeownersQ1'), a: t('usefulInfo.homeownersA1') },
        { q: t('usefulInfo.homeownersQ2'), a: t('usefulInfo.homeownersA2') },
        { q: t('usefulInfo.homeownersQ3'), a: t('usefulInfo.homeownersA3') },
        { q: t('usefulInfo.homeownersQ4'), a: t('usefulInfo.homeownersA4') },
        { q: t('usefulInfo.homeownersQ5'), a: t('usefulInfo.homeownersA5') },
        { q: t('usefulInfo.homeownersQ6'), a: t('usefulInfo.homeownersA6') }
      ]
    }
  ]

  const colorClasses = {
    blue: {
      gradient: 'from-blue-600 via-blue-700 to-blue-900',
      border: 'border-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600'
    },
    green: {
      gradient: 'from-green-600 via-green-700 to-green-900',
      border: 'border-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600'
    },
    purple: {
      gradient: 'from-purple-600 via-purple-700 to-purple-900',
      border: 'border-purple-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600'
    },
    orange: {
      gradient: 'from-orange-600 via-orange-700 to-orange-900',
      border: 'border-orange-600',
      bg: 'bg-orange-50',
      text: 'text-orange-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('usefulInfo.title')}
            </h1>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 p-3 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto space-y-16">
          {sections.map((section, index) => {
            const Icon = section.icon
            const colors = colorClasses[section.color as keyof typeof colorClasses]

            return (
              <div key={section.id} className="scroll-mt-20" id={section.id}>
                <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                      <Icon className={`h-8 w-8 ${colors.text}`} />
                    </div>
                    <div>
                      <h2 className={`text-3xl font-bold ${colors.text}`}>{section.title}</h2>
                      <p className="text-gray-600">{section.subtitle}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {section.questions.map((item, qIndex) => (
                      <div key={qIndex} className={`border-l-4 ${colors.border} pl-4 py-2`}>
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">{item.q}</h3>
                        <div
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.a }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
