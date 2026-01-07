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
import { AlertTriangle, XCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface CVSensitiveDataWarningProps {
  isOpen: boolean
  onContinue: () => Promise<void>
  onReview: () => void
  professionalId: string
}

export default function CVSensitiveDataWarning({
  isOpen,
  onContinue,
  onReview,
  professionalId,
}: CVSensitiveDataWarningProps) {
  const { t } = useTranslation()
  const [acknowledged, setAcknowledged] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    if (!acknowledged) return

    setIsLoading(true)
    try {
      await onContinue()
    } catch (error) {
      console.error('Error continuing after warning:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setAcknowledged(false)
    onReview()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <DialogTitle className="text-2xl text-orange-900">
              {t('cv.sensitiveWarning.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {t('cv.sensitiveWarning.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning box */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <p className="font-semibold text-sm text-red-900 mb-3">
              {t('cv.sensitiveWarning.doNotIncludeTitle')}
            </p>
            <ul className="space-y-2">
              {t('cv.sensitiveWarning.doNotInclude').map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                  <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why this matters */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-medium text-sm text-blue-900 mb-2">
              {t('cv.sensitiveWarning.whyThisMatters')}
            </p>
            <p className="text-sm text-blue-800">
              {t('cv.sensitiveWarning.gdprLgpdExplanation')}
            </p>
          </div>

          {/* What to include instead */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-medium text-sm text-green-900 mb-2">
              {t('cv.sensitiveWarning.safeToInclude')}
            </p>
            <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
              <li>{t('cv.sensitiveWarning.professionalTitle')}</li>
              <li>{t('cv.sensitiveWarning.workExperience')}</li>
              <li>{t('cv.sensitiveWarning.educationQualifications')}</li>
              <li>{t('cv.sensitiveWarning.skillsCertifications')}</li>
              <li>{t('cv.sensitiveWarning.cityRegion')}</li>
              <li>{t('cv.sensitiveWarning.professionalEmail')}</li>
            </ul>
          </div>

          {/* Acknowledgment checkbox */}
          <div className="flex items-start space-x-3 pt-4 border-t">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              className="mt-1"
            />
            <label
              htmlFor="acknowledge"
              className="text-sm font-medium leading-tight cursor-pointer"
            >
              {t('cv.sensitiveWarning.acknowledgment')}
            </label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="sm:flex-1"
          >
            {t('cv.sensitiveWarning.reviewButton')}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!acknowledged || isLoading}
            className="sm:flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? t('common.loading') : t('cv.sensitiveWarning.continueButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
