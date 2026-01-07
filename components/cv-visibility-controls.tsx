"use client"

import { useState } from "react"
import { Lock, Eye, Building2, FileText, CheckCircle, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTranslation } from "@/lib/i18n/use-translation"

export type CVVisibility = 'private' | 'public' | 'employers_only' | 'per_application'

interface CVVisibilityControlsProps {
  professionalId: string
  currentVisibility: CVVisibility
  onVisibilityChange: (newVisibility: CVVisibility) => void
}

interface VisibilityOption {
  value: CVVisibility
  icon: React.ComponentType<{ className?: string }>
  labelKey: string
  descriptionKey: string
}

export default function CVVisibilityControls({
  professionalId,
  currentVisibility,
  onVisibilityChange,
}: CVVisibilityControlsProps) {
  const { t } = useTranslation()
  const [selectedVisibility, setSelectedVisibility] = useState<CVVisibility>(currentVisibility)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const visibilityOptions: VisibilityOption[] = [
    {
      value: 'private',
      icon: Lock,
      labelKey: 'cv.visibility.private.label',
      descriptionKey: 'cv.visibility.private.description',
    },
    {
      value: 'public',
      icon: Eye,
      labelKey: 'cv.visibility.public.label',
      descriptionKey: 'cv.visibility.public.description',
    },
    {
      value: 'employers_only',
      icon: Building2,
      labelKey: 'cv.visibility.employersOnly.label',
      descriptionKey: 'cv.visibility.employersOnly.description',
    },
    {
      value: 'per_application',
      icon: FileText,
      labelKey: 'cv.visibility.perApplication.label',
      descriptionKey: 'cv.visibility.perApplication.description',
    },
  ]

  const hasChanges = selectedVisibility !== currentVisibility

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/cv/visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professionalId,
          visibility: selectedVisibility,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update visibility')
      }

      setSuccess(t('cv.visibility.saveSuccess'))
      onVisibilityChange(selectedVisibility)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      console.error('Error updating visibility:', err)
      setError(err.message || t('cv.visibility.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedVisibility(currentVisibility)
    setError(null)
    setSuccess(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('cv.visibility.title')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{t('cv.visibility.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>{t('cv.visibility.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Visibility Options */}
        <RadioGroup
          value={selectedVisibility}
          onValueChange={(value) => setSelectedVisibility(value as CVVisibility)}
          disabled={isSaving}
          className="space-y-3"
        >
          {visibilityOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedVisibility === option.value
            const isCurrent = currentVisibility === option.value

            return (
              <div key={option.value} className="relative">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className={`
                    flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer
                    transition-all hover:bg-accent
                    ${isSelected ? 'border-primary bg-primary/5' : 'border-muted'}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{t(option.labelKey)}</p>
                      {isCurrent && !hasChanges && (
                        <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t(option.descriptionKey)}
                    </p>
                  </div>
                </Label>
              </div>
            )
          })}
        </RadioGroup>

        {/* Privacy Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>{t('cv.visibility.privacyNoticeTitle')}:</strong>{' '}
            {t('cv.visibility.privacyNotice')}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? t('cv.visibility.saving') : t('cv.visibility.saveButton')}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
            >
              {t('cv.visibility.cancelButton')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
