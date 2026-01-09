"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InfoIcon, ExternalLink, Shield } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n/context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CVConsentModalProps {
  isOpen: boolean
  onConsent: () => Promise<void>
  onDecline: () => void
  professionalId: string
}

export default function CVConsentModal({
  isOpen,
  onConsent,
  onDecline,
  professionalId,
}: CVConsentModalProps) {
  const { t, locale } = useTranslation()
  const [consentGiven, setConsentGiven] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const privacyPolicyUrl = locale === 'pt-BR' ? '/br/privacy' : '/privacy'

  const handleConsent = async () => {
    if (!consentGiven) return

    setIsLoading(true)
    try {
      // Call API to record consent
      const response = await fetch('/api/cv/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId,
          consentGiven: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record consent')
      }

      await onConsent()
    } catch (error) {
      console.error('Error recording consent:', error)
      alert(t('cv.consent.errorRecording'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] sm:w-full p-4 sm:p-6"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <DialogTitle className="text-xl sm:text-2xl">{t('cv.consent.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base">
            {t('cv.consent.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          {/* Information card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex gap-2 sm:gap-3">
              <InfoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-blue-900">
                <p className="font-medium">{t('cv.consent.whatWeCollect')}</p>
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-1 sm:ml-2">
                  <li>{t('cv.consent.workHistory')}</li>
                  <li>{t('cv.consent.education')}</li>
                  <li>{t('cv.consent.skillsAndCertifications')}</li>
                  <li>{t('cv.consent.uploadedDocuments')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How we use it */}
          <div className="space-y-1 sm:space-y-2">
            <p className="font-medium text-xs sm:text-sm">{t('cv.consent.howWeUseIt')}</p>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 sm:space-y-1 ml-3 sm:ml-4 list-disc">
              <li>{t('cv.consent.matchYouWithJobs')}</li>
              <li>{t('cv.consent.showToEmployers')}</li>
              <li>{t('cv.consent.improveRecommendations')}</li>
            </ul>
          </div>

          {/* What we DON'T do */}
          <div className="space-y-1 sm:space-y-2">
            <p className="font-medium text-xs sm:text-sm text-red-600">{t('cv.consent.whatWeDontDo')}</p>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 sm:space-y-1 ml-3 sm:ml-4 list-disc">
              <li>{t('cv.consent.noThirdPartySales')}</li>
              <li>{t('cv.consent.noMarketingEmails')}</li>
              <li>{t('cv.consent.noDataBrokers')}</li>
            </ul>
          </div>

          {/* Your rights */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
            <p className="font-medium text-xs sm:text-sm text-green-900 mb-1 sm:mb-2">
              {t('cv.consent.yourRights')}
            </p>
            <ul className="text-[10px] sm:text-xs text-green-800 space-y-0.5 sm:space-y-1 ml-3 sm:ml-4 list-disc">
              <li>{t('cv.consent.viewAndEdit')}</li>
              <li>{t('cv.consent.deleteAnytime')}</li>
              <li>{t('cv.consent.controlVisibility')}</li>
              <li>{t('cv.consent.revokeConsent')}</li>
            </ul>
          </div>

          {/* Consent checkbox */}
          <div className="flex items-start space-x-2 sm:space-x-3 pt-3 sm:pt-4 border-t">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
              className="mt-0.5 sm:mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor="consent"
                className="text-xs sm:text-sm font-medium leading-tight cursor-pointer flex items-center gap-1 sm:gap-2"
              >
                {t('cv.consent.consentText')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>{t('cv.consent.tooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
            </div>
          </div>

          {/* Privacy Policy link */}
          <div className="text-center">
            <Link
              href={privacyPolicyUrl}
              target="_blank"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {t('cv.consent.privacyPolicyLink')}
            </Link>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            className="w-full sm:flex-1 text-xs sm:text-sm h-9 sm:h-10"
          >
            {t('cv.consent.declineButton')}
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!consentGiven || isLoading}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm h-9 sm:h-10"
          >
            {isLoading ? t('common.loading') : t('cv.consent.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
