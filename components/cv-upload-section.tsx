"use client"

import { useState, useCallback } from "react"
import { Upload, File, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CVSensitiveDataWarning from "./cv-sensitive-data-warning"
import { useTranslation } from "@/lib/i18n/use-translation"

interface CVUploadSectionProps {
  professionalId: string
  currentFile?: {
    name: string
    size: number
    type: string
    path: string
    uploadedAt: string
  } | null
  onUploadSuccess: (fileData: any) => void
  onDeleteSuccess: () => void
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

export default function CVUploadSection({
  professionalId,
  currentFile,
  onUploadSuccess,
  onDeleteSuccess,
}: CVUploadSectionProps) {
  const { t } = useTranslation()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES)
    if (!acceptedTypes.includes(file.type)) {
      return t('cv.upload.errorType')
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return t('cv.upload.errorSize')
    }

    return null
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('professionalId', professionalId)

      // Simulate progress (since FormData upload doesn't provide real progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/cv/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      setSuccess(t('cv.upload.success'))
      onUploadSuccess(data)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || t('cv.upload.errorGeneric'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setPendingFile(null)
    }
  }

  const handleSensitiveWarningContinue = async () => {
    setShowSensitiveWarning(false)
    if (pendingFile) {
      await uploadFile(pendingFile)
    }
  }

  const handleSensitiveWarningReview = () => {
    setShowSensitiveWarning(false)
    setPendingFile(null)
    setError(null)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setSuccess(null)

    if (acceptedFiles.length === 0) {
      setError(t('cv.upload.errorType'))
      return
    }

    const file = acceptedFiles[0]
    const validationError = validateFile(file)

    if (validationError) {
      setError(validationError)
      return
    }

    // Show sensitive data warning before upload
    setPendingFile(file)
    setShowSensitiveWarning(true)
  }, [t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isUploading,
  })

  const handleDelete = async () => {
    if (!currentFile) return

    const confirmDelete = window.confirm(t('cv.upload.confirmDelete'))
    if (!confirmDelete) return

    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/cv/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ professionalId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      setSuccess(t('cv.upload.deleteSuccess'))
      onDeleteSuccess()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || t('cv.upload.errorDeleteGeneric'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('cv.upload.title')}</CardTitle>
          <CardDescription>{t('cv.upload.description')}</CardDescription>
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

          {/* Current File Display */}
          {currentFile && !isUploading && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <File className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{currentFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(currentFile.size)} • {t('cv.upload.uploadedOn')}{' '}
                      {new Date(currentFile.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm font-medium">{t('cv.upload.uploading')}</p>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
            </div>
          )}

          {/* Dropzone */}
          {!isUploading && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {isDragActive ? t('cv.upload.dropHere') : t('cv.upload.dragDrop')}
              </p>
              <p className="text-xs text-muted-foreground">{t('cv.upload.acceptedFormats')}</p>
            </div>
          )}

          {/* Upload/Replace Button */}
          {!isUploading && (
            <Button
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              variant={currentFile ? "outline" : "default"}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {currentFile ? t('cv.upload.replaceButton') : t('cv.upload.uploadButton')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sensitive Data Warning Modal */}
      <CVSensitiveDataWarning
        isOpen={showSensitiveWarning}
        onContinue={handleSensitiveWarningContinue}
        onReview={handleSensitiveWarningReview}
        professionalId={professionalId}
      />
    </>
  )
}
