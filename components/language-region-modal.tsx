"use client"

import { useState } from 'react'
import { useLanguageRegion } from '@/contexts/language-region-context'
import { Globe, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LANGUAGES, COUNTRIES, type Language, type Country } from '@/lib/i18n/language-region'

export function LanguageRegionModal() {
  const { state, updateLanguageRegion, isModalOpen, closeModal } = useLanguageRegion()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(state.language)
  const [selectedCountry, setSelectedCountry] = useState<Country>(state.country)

  // Reset selections when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedLanguage(state.language)
      setSelectedCountry(state.country)
    } else {
      closeModal()
    }
  }

  const handleSave = () => {
    updateLanguageRegion(selectedLanguage, selectedCountry)
  }

  const hasChanges = selectedLanguage !== state.language || selectedCountry !== state.country

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language & Region
          </DialogTitle>
          <DialogDescription>
            Choose your preferred language and region
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Language</h3>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all
                    ${
                      selectedLanguage === lang.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  aria-label={`Select ${lang.name}`}
                >
                  <span className="font-medium text-gray-900">{lang.name}</span>
                  {selectedLanguage === lang.code && (
                    <Check className="w-5 h-5 text-blue-500" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Region Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Region</h3>
            <div className="space-y-2">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all
                    ${
                      selectedCountry === country.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  aria-label={`Select ${country.name}`}
                >
                  <span className="font-medium text-gray-900">{country.name}</span>
                  {selectedCountry === country.code && (
                    <Check className="w-5 h-5 text-blue-500" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => closeModal()}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
