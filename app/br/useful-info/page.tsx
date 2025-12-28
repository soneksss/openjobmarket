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
      subtitle: t('usefulInfo.hiringTalentTips'),
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
      subtitle: t('usefulInfo.growingBusinessTips'),
      color: 'orange',
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
      subtitle: t('usefulInfo.hiringTradespeopleTips'),
      color: 'purple',
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
      gradient: 'from-blue-600 to-blue-700',
      border: 'border-blue-600',
      icon: 'text-blue-600'
    },
    green: {
      gradient: 'from-green-600 to-green-700',
      border: 'border-green-600',
      icon: 'text-green-600'
    },
    orange: {
      gradient: 'from-orange-600 to-orange-700',
      border: 'border-orange-600',
      icon: 'text-orange-600'
    },
    purple: {
      gradient: 'from-purple-600 to-purple-700',
      border: 'border-purple-600',
      icon: 'text-purple-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 py-16 md:py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {t('usefulInfo.title')}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light">
              {t('usefulInfo.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto space-y-16">
          {sections.map((section) => {
            const Icon = section.icon
            const colors = colorClasses[section.color as keyof typeof colorClasses]

            return (
              <div key={section.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${colors.gradient} text-white px-6 md:px-8 py-6`}>
                  <div className="flex items-center gap-4">
                    <Icon className="h-10 w-10 md:h-12 md:w-12" />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold">{section.title}</h2>
                      <p className="text-lg text-white/90 mt-1">{section.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {section.questions.map((item, index) => (
                    <div key={index} className={`border-l-4 ${colors.border} pl-6 py-2`}>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">
                        {item.q}
                      </h3>
                      <div
                        className="text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.a }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Quick Navigation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex flex-col items-center gap-3 p-4 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Icon className="h-8 w-8" />
                    <span className="text-sm font-medium text-center">{section.title}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
