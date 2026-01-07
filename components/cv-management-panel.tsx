"use client"

import { useState } from "react"
import { FileText, Eye, Download, Trash2, Settings, Upload, Edit, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import CVVisibilityControls from "./cv-visibility-controls"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useRouter } from "next/navigation"

type CVSource = 'builder' | 'upload' | null
type CVVisibility = 'private' | 'public' | 'employers_only' | 'per_application'

interface CVManagementPanelProps {
  professionalId: string
  cvSource: CVSource
  cvVisibility: CVVisibility
  uploadedFileName?: string | null
  uploadedFileSize?: number | null
  uploadedAt?: string | null
  onCVDeleted?: () => void
  onVisibilityChanged?: (newVisibility: CVVisibility) => void
}

export default function CVManagementPanel({
  professionalId,
  cvSource,
  cvVisibility,
  uploadedFileName,
  uploadedFileSize,
  uploadedAt,
  onCVDeleted,
  onVisibilityChanged,
}: CVManagementPanelProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasCV = cvSource !== null
  const isBuilt = cvSource === 'builder'
  const isUploaded = cvSource === 'upload'

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleViewCV = () => {
    if (isBuilt) {
      router.push('/cv/builder')
    } else if (isUploaded) {
      // Open CV in new tab
      window.open(`/api/cv/download?professionalId=${professionalId}&type=upload`, '_blank')
    }
  }

  const handleEditCV = () => {
    if (isBuilt) {
      router.push('/cv/builder')
    } else if (isUploaded) {
      router.push('/cv/upload') // Assuming this route exists
    }
  }

  const handleDownloadCV = async () => {
    try {
      const response = await fetch(`/api/cv/download?professionalId=${professionalId}&type=${cvSource}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download CV')
      }

      // For uploaded files
      if (isUploaded) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = uploadedFileName || 'cv.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err: any) {
      console.error('Download error:', err)
      setError(err.message || t('cv.management.downloadError'))
    }
  }

  const handleDeleteCV = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      if (isUploaded) {
        // Delete uploaded file
        const response = await fetch('/api/cv/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ professionalId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete CV')
        }
      } else if (isBuilt) {
        // Delete builder CV (implement API endpoint for this)
        throw new Error('Builder CV deletion not yet implemented')
      }

      setShowDeleteConfirm(false)
      onCVDeleted?.()
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || t('cv.management.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  const getCVStatusBadge = () => {
    if (!hasCV) {
      return <Badge variant="outline" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        {t('cv.source.none')}
      </Badge>
    }

    if (isBuilt) {
      return <Badge variant="default" className="flex items-center gap-1 bg-blue-500">
        <CheckCircle className="h-3 w-3" />
        {t('cv.source.builder')}
      </Badge>
    }

    if (isUploaded) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-500">
        <CheckCircle className="h-3 w-3" />
        {t('cv.source.uploaded')}
      </Badge>
    }

    return null
  }

  const getVisibilityBadge = () => {
    const visibilityConfig: Record<CVVisibility, { label: string; color: string }> = {
      private: { label: t('cv.visibility.private.label'), color: 'bg-gray-500' },
      public: { label: t('cv.visibility.public.label'), color: 'bg-green-500' },
      employers_only: { label: t('cv.visibility.employersOnly.label'), color: 'bg-blue-500' },
      per_application: { label: t('cv.visibility.perApplication.label'), color: 'bg-purple-500' },
    }

    const config = visibilityConfig[cvVisibility]

    return <Badge className={`${config.color} text-white`}>
      {config.label}
    </Badge>
  }

  if (!hasCV) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('cv.management.noCVTitle')}</CardTitle>
          <CardDescription>{t('cv.management.noCVDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => router.push('/cv/builder')} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            {t('cv.source.buildOption')}
          </Button>
          <Button onClick={() => router.push('/cv/upload')} variant="outline" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {t('cv.source.uploadOption')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{t('cv.management.title')}</CardTitle>
              <CardDescription>{t('cv.management.description')}</CardDescription>
            </div>
            {getCVStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CV Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('cv.management.visibility')}:</span>
              {getVisibilityBadge()}
            </div>

            {isUploaded && uploadedFileName && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('cv.management.fileName')}:</span>
                    <span className="text-sm text-muted-foreground">{uploadedFileName}</span>
                  </div>
                  {uploadedFileSize && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('cv.management.fileSize')}:</span>
                      <span className="text-sm text-muted-foreground">{formatFileSize(uploadedFileSize)}</span>
                    </div>
                  )}
                  {uploadedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('cv.management.uploadedOn')}:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleViewCV} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              {t('cv.management.viewCV')}
            </Button>
            <Button onClick={handleEditCV} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              {t('cv.management.editCV')}
            </Button>
            <Button onClick={handleDownloadCV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('cv.management.downloadCV')}
            </Button>
            <Button onClick={() => setShowVisibilitySettings(!showVisibilitySettings)} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              {t('cv.management.privacySettings')}
            </Button>
          </div>

          {/* Visibility Settings (collapsible) */}
          {showVisibilitySettings && (
            <div className="pt-4">
              <CVVisibilityControls
                professionalId={professionalId}
                currentVisibility={cvVisibility}
                onVisibilityChange={(newVisibility) => {
                  onVisibilityChanged?.(newVisibility)
                  setShowVisibilitySettings(false)
                }}
              />
            </div>
          )}

          <Separator />

          {/* Delete Button */}
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('cv.management.deleteCV')}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cv.management.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cv.management.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cv.visibility.cancelButton')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCV}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? t('cv.management.deleting') : t('cv.management.deleteCV')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
