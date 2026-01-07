"use client"

import { useState } from "react"
import { FileText, Upload, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/lib/i18n/use-translation"

export type CVSource = 'builder' | 'upload'

interface CVSourceSelectorProps {
  currentSource: CVSource | null
  onSourceChange: (newSource: CVSource) => Promise<void>
  disabled?: boolean
}

export default function CVSourceSelector({
  currentSource,
  onSourceChange,
  disabled = false,
}: CVSourceSelectorProps) {
  const { t } = useTranslation()
  const [selectedSource, setSelectedSource] = useState<CVSource | null>(currentSource)
  const [showSwitchWarning, setShowSwitchWarning] = useState(false)
  const [pendingSource, setPendingSource] = useState<CVSource | null>(null)
  const [isChanging, setIsChanging] = useState(false)

  const handleSourceSelect = (newSource: CVSource) => {
    // If no current source, allow direct selection
    if (!currentSource) {
      setSelectedSource(newSource)
      handleConfirmSwitch(newSource)
      return
    }

    // If selecting the same source, do nothing
    if (newSource === currentSource) {
      return
    }

    // If switching sources, show warning
    setPendingSource(newSource)
    setShowSwitchWarning(true)
  }

  const handleConfirmSwitch = async (newSource: CVSource) => {
    setIsChanging(true)
    try {
      await onSourceChange(newSource)
      setSelectedSource(newSource)
    } catch (error) {
      console.error('Error changing CV source:', error)
      // Revert selection on error
      setSelectedSource(currentSource)
    } finally {
      setIsChanging(false)
      setShowSwitchWarning(false)
      setPendingSource(null)
    }
  }

  const handleCancelSwitch = () => {
    setShowSwitchWarning(false)
    setPendingSource(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('cv.source.title')}</CardTitle>
          <CardDescription>{t('cv.source.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedSource || ''}
            onValueChange={(value) => handleSourceSelect(value as CVSource)}
            disabled={disabled || isChanging}
            className="grid gap-4 md:grid-cols-2"
          >
            {/* Build CV Option */}
            <div>
              <RadioGroupItem value="builder" id="builder" className="peer sr-only" />
              <Label
                htmlFor="builder"
                className={`
                  flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer
                  transition-all hover:bg-accent
                  ${selectedSource === 'builder' ? 'border-primary bg-primary/5' : 'border-muted'}
                  ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <FileText className={`h-12 w-12 mb-3 ${selectedSource === 'builder' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center space-y-2">
                  <p className="font-semibold">{t('cv.source.buildOption')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('cv.source.buildDescription')}
                  </p>
                </div>
                {selectedSource === 'builder' && (
                  <div className="mt-3 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {t('cv.source.currentChoice')}
                  </div>
                )}
              </Label>
            </div>

            {/* Upload CV Option */}
            <div>
              <RadioGroupItem value="upload" id="upload" className="peer sr-only" />
              <Label
                htmlFor="upload"
                className={`
                  flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer
                  transition-all hover:bg-accent
                  ${selectedSource === 'upload' ? 'border-primary bg-primary/5' : 'border-muted'}
                  ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Upload className={`h-12 w-12 mb-3 ${selectedSource === 'upload' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center space-y-2">
                  <p className="font-semibold">{t('cv.source.uploadOption')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('cv.source.uploadDescription')}
                  </p>
                </div>
                {selectedSource === 'upload' && (
                  <div className="mt-3 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {t('cv.source.currentChoice')}
                  </div>
                )}
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Switch Warning Dialog */}
      <AlertDialog open={showSwitchWarning} onOpenChange={setShowSwitchWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {t('cv.source.switchWarningTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t('cv.source.switchWarning')}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  <strong>{t('cv.source.willBeDeleted')}:</strong>{' '}
                  {currentSource === 'builder'
                    ? t('cv.source.builtCV')
                    : t('cv.source.uploadedCV')}
                </p>
              </div>
              <p className="text-sm">{t('cv.source.actionIrreversible')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>
              {t('cv.source.cancelButton')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingSource && handleConfirmSwitch(pendingSource)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {t('cv.source.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
