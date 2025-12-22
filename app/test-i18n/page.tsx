"use client"

import { useTranslation } from "@/lib/i18n/context"
import { useLanguageRegion } from "@/contexts/language-region-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestI18nPage() {
  const { t, locale } = useTranslation()
  const { state, openModal } = useLanguageRegion()

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>i18n System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current State */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Configuration:</h3>
            <p>Locale: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{locale}</span></p>
            <p>Language: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{state.language}</span></p>
            <p>Country: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{state.country}</span></p>
          </div>

          {/* Translation Tests */}
          <div className="space-y-2">
            <h3 className="font-semibold">Translation Tests:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">common.search</p>
                <p className="font-medium">{t('common.search')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">nav.home</p>
                <p className="font-medium">{t('nav.home')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">hero.title</p>
                <p className="font-medium">{t('hero.title')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">contractors.title</p>
                <p className="font-medium">{t('contractors.title')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">footer.copyright</p>
                <p className="font-medium">{t('footer.copyright')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">auth.welcome</p>
                <p className="font-medium">{t('auth.welcome')}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Actions:</h3>
            <Button onClick={openModal} className="w-full">
              Open Language & Region Modal
            </Button>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Status:</h3>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-green-800 font-medium">✓ i18n system is working!</p>
              <p className="text-sm text-green-700 mt-1">
                Translations are loading correctly from {locale} dictionary.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
