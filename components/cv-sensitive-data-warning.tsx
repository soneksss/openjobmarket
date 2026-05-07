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
    console.log('Continue clicked, acknowledged:', acknowledged)
    if (!acknowledged) {
      console.log('Cannot continue - not acknowledged')
      return
    }

    setIsLoading(true)
    try {
      console.log('Calling onContinue...')
      await onContinue()
      console.log('onContinue completed')
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

  const handleClose = () => {
    console.log('Dialog close requested')
    setAcknowledged(false)
    onReview()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] sm:w-full p-4 sm:p-6"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
            <DialogTitle className="text-xl sm:text-2xl text-orange-900">
              {t('cv.sensitiveWarning.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base">
            {t('cv.sensitiveWarning.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          {/* Warning box */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 sm:p-4">
            <p className="font-semibold text-xs sm:text-sm text-red-900 mb-2 sm:mb-3">
              {t('cv.sensitiveWarning.doNotIncludeTitle')}
            </p>
            <ul className="space-y-1 sm:space-y-2">
              {(t('cv.sensitiveWarning.doNotInclude') as unknown as string[]).map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-red-800">
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why this matters */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="font-medium text-xs sm:text-sm text-blue-900 mb-1 sm:mb-2">
              {t('cv.sensitiveWarning.whyThisMatters')}
            </p>
            <p className="text-xs sm:text-sm text-blue-800">
              {t('cv.sensitiveWarning.gdprLgpdExplanation')}
            </p>
          </div>

          {/* What to include instead */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <p className="font-medium text-xs sm:text-sm text-green-900 mb-1 sm:mb-2">
              {t('cv.sensitiveWarning.safeToInclude')}
            </p>
            <ul className="text-xs sm:text-sm text-green-800 space-y-0.5 sm:space-y-1 ml-3 sm:ml-4 list-disc">
              <li>{t('cv.sensitiveWarning.professionalTitle')}</li>
              <li>{t('cv.sensitiveWarning.workExperience')}</li>
              <li>{t('cv.sensitiveWarning.educationQualifications')}</li>
              <li>{t('cv.sensitiveWarning.skillsCertifications')}</li>
              <li>{t('cv.sensitiveWarning.cityRegion')}</li>
              <li>{t('cv.sensitiveWarning.professionalEmail')}</li>
            </ul>
          </div>

          {/* Acknowledgment checkbox - PROMINENT */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 sm:p-5 mt-2">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => {
                  console.log('Checkbox changed:', checked)
                  setAcknowledged(checked as boolean)
                }}
                className="mt-1 flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 border-2 border-yellow-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <label
                htmlFor="acknowledge"
                className="text-sm sm:text-base font-bold leading-normal cursor-pointer flex-1 text-gray-900"
              >
                {t('cv.sensitiveWarning.acknowledgment')}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="w-full sm:flex-1 text-xs sm:text-sm h-10 px-4"
          >
            {t('cv.sensitiveWarning.reviewButton')}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!acknowledged || isLoading}
            className={`w-full sm:flex-1 text-xs sm:text-sm h-10 px-4 ${
              acknowledged && !isLoading
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? t('common.loading') : t('cv.sensitiveWarning.continueButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
