'use client'

import { useTranslation } from "@/lib/i18n/context"

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Compact Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {t('about.title')}
            </h1>
            <p className="text-lg md:text-xl text-blue-100">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content - Single Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow-md border-2 border-slate-200 p-6">
            <p className="text-base leading-relaxed text-slate-800 font-medium mb-3">
              {t('about.description')}
            </p>
            <p className="text-base leading-relaxed text-slate-700 mb-3">
              {t('about.recognition')}
            </p>
            <p className="text-base leading-relaxed font-semibold text-blue-700">
              {t('about.tagline')}
            </p>
          </div>

          {/* Section Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-800 pt-2">
            {t('about.helpTitle')}
          </h2>

          {/* 4 Cards Grid - Compact */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Talent Card */}
            <div className="bg-white rounded-lg shadow-md border-3 border-blue-500 overflow-hidden hover:shadow-xl transition-all hover:scale-105">
              <div className="bg-blue-600 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{t('about.talentIcon')}</span>
                  <h3 className="text-lg font-bold leading-tight">{t('about.talentTitle')}</h3>
                </div>
                <p className="text-blue-100 text-sm">{t('about.talentSubtitle')}</p>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.talentPoint1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.talentPoint2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.talentPoint3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.talentPoint4')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Companies Card */}
            <div className="bg-white rounded-lg shadow-md border-3 border-green-500 overflow-hidden hover:shadow-xl transition-all hover:scale-105">
              <div className="bg-green-600 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{t('about.companiesIcon')}</span>
                  <h3 className="text-lg font-bold leading-tight">{t('about.companiesTitle')}</h3>
                </div>
                <p className="text-green-100 text-sm">{t('about.companiesSubtitle')}</p>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.companiesPoint1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.companiesPoint2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.companiesPoint3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.companiesPoint4')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tradespeople Card */}
            <div className="bg-white rounded-lg shadow-md border-3 border-orange-500 overflow-hidden hover:shadow-xl transition-all hover:scale-105">
              <div className="bg-orange-600 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{t('about.tradespeopleIcon')}</span>
                  <h3 className="text-lg font-bold leading-tight">{t('about.tradespeopleTitle')}</h3>
                </div>
                <p className="text-orange-100 text-sm">{t('about.tradespeopleSubtitle')}</p>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.tradespeoplePoint1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.tradespeoplePoint2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.tradespeoplePoint3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.tradespeoplePoint4')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Homeowners Card */}
            <div className="bg-white rounded-lg shadow-md border-3 border-purple-500 overflow-hidden hover:shadow-xl transition-all hover:scale-105">
              <div className="bg-purple-600 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{t('about.homeownersIcon')}</span>
                  <h3 className="text-lg font-bold leading-tight">{t('about.homeownersTitle')}</h3>
                </div>
                <p className="text-purple-100 text-sm">{t('about.homeownersSubtitle')}</p>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.homeownersPoint1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.homeownersPoint2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.homeownersPoint3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                    <span className="text-slate-700 text-sm font-medium">{t('about.homeownersPoint4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why It Works - Compact */}
          <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg shadow-lg p-6 mt-4">
            <h2 className="text-2xl font-bold text-center text-white mb-4">
              {t('about.whyTitle')}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center border-2 border-white/30">
                <p className="text-lg md:text-xl font-bold text-white">{t('about.whyPoint1')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center border-2 border-white/30">
                <p className="text-lg md:text-xl font-bold text-white">{t('about.whyPoint2')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center border-2 border-white/30">
                <p className="text-lg md:text-xl font-bold text-white">{t('about.whyPoint3')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
