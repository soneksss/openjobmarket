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
        className="sm:max-w-[550px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <DialogTitle className="text-2xl">{t('cv.consent.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {t('cv.consent.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Information card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">{t('cv.consent.whatWeCollect')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('cv.consent.workHistory')}</li>
                  <li>{t('cv.consent.education')}</li>
                  <li>{t('cv.consent.skillsAndCertifications')}</li>
                  <li>{t('cv.consent.uploadedDocuments')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How we use it */}
          <div className="space-y-2">
            <p className="font-medium text-sm">{t('cv.consent.howWeUseIt')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>{t('cv.consent.matchYouWithJobs')}</li>
              <li>{t('cv.consent.showToEmployers')}</li>
              <li>{t('cv.consent.improveRecommendations')}</li>
            </ul>
          </div>

          {/* What we DON'T do */}
          <div className="space-y-2">
            <p className="font-medium text-sm text-red-600">{t('cv.consent.whatWeDontDo')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>{t('cv.consent.noThirdPartySales')}</li>
              <li>{t('cv.consent.noMarketingEmails')}</li>
              <li>{t('cv.consent.noDataBrokers')}</li>
            </ul>
          </div>

          {/* Your rights */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-medium text-sm text-green-900 mb-2">
              {t('cv.consent.yourRights')}
            </p>
            <ul className="text-xs text-green-800 space-y-1 ml-4 list-disc">
              <li>{t('cv.consent.viewAndEdit')}</li>
              <li>{t('cv.consent.deleteAnytime')}</li>
              <li>{t('cv.consent.controlVisibility')}</li>
              <li>{t('cv.consent.revokeConsent')}</li>
            </ul>
          </div>

          {/* Consent checkbox */}
          <div className="flex items-start space-x-3 pt-4 border-t">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-tight cursor-pointer flex items-center gap-2"
              >
                {t('cv.consent.consentText')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
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
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {t('cv.consent.privacyPolicyLink')}
            </Link>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            className="sm:flex-1"
          >
            {t('cv.consent.declineButton')}
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!consentGiven || isLoading}
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? t('common.loading') : t('cv.consent.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
