"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"
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

type DeletionReason =
  | 'cant_find_what_looking_for'
  | 'not_enough_users'
  | 'too_complicated'
  | 'poor_ux'
  | 'trust_safety_concerns'
  | 'found_alternative'
  | 'temporary_use'
  | 'technical_issues'
  | 'privacy_concerns'
  | 'not_using'
  | 'other'

interface AccountDeletionFlowProps {
  userEmail: string
  onCancel: () => void
}

export function AccountDeletionFlow({ userEmail, onCancel }: AccountDeletionFlowProps) {
  const [step, setStep] = useState(1)
  const [selectedReason, setSelectedReason] = useState<DeletionReason | null>(null)
  const [customFeedback, setCustomFeedback] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmCheckbox, setConfirmCheckbox] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFinalDialog, setShowFinalDialog] = useState(false)

  const { t } = useTranslation()
  const router = useRouter()
  const supabase = createClient()

  const totalSteps = 6

  const deletionReasons: DeletionReason[] = [
    'cant_find_what_looking_for',
    'not_enough_users',
    'too_complicated',
    'poor_ux',
    'trust_safety_concerns',
    'found_alternative',
    'temporary_use',
    'technical_issues',
    'privacy_concerns',
    'not_using',
    'other',
  ]

  const handleNext = () => {
    setError(null)

    // Validation for step 2
    if (step === 2 && !selectedReason) {
      setError(t('accountDeletion.selectReasonRequired'))
      return
    }

    // Validation for step 5
    if (step === 5) {
      if (confirmEmail !== userEmail) {
        setError(t('accountDeletion.invalidCredentials'))
        return
      }
      if (!confirmPassword) {
        setError(t('accountDeletion.invalidCredentials'))
        return
      }
      if (!confirmCheckbox) {
        setError(t('accountDeletion.checkboxRequired'))
        return
      }
    }

    if (step < totalSteps) {
      setStep(step + 1)
    }

    // Show final dialog on step 6
    if (step === 5) {
      setShowFinalDialog(true)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleStayAccount = () => {
    onCancel()
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      // Call server-side API route for comprehensive deletion
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryReason: selectedReason,
          customMessage: customFeedback || null,
          userEmail: userEmail,
          userPassword: confirmPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || t('accountDeletion.errorMessage'))
        setIsDeleting(false)
        setShowFinalDialog(false)
        return
      }

      console.log("[Deletion] Account deletion successful, cleaning up client state")

      // Clear local storage / session storage
      localStorage.clear()
      sessionStorage.clear()

      // 'local' scope clears in-memory + localStorage session without a server
      // round-trip. Await so SIGNED_OUT fires before we navigate away.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* deleted user, ignore */ }

      // router.refresh() forces Next.js server components to re-render with the
      // now-cleared auth state, then navigate to home. More reliable than
      // window.location.href in Capacitor WebView where hard reloads can race.
      router.refresh()
      router.push(result.redirect || '/')
    } catch (err: any) {
      console.error("Error deleting account:", err)
      setError(err.message || t('accountDeletion.errorMessage'))
      setIsDeleting(false)
      setShowFinalDialog(false)
    }
  }

  // Step 1: Warning
  const renderStep1 = () => (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p className="font-semibold">{t('accountDeletion.warningTitle')}</p>
            <p>{t('accountDeletion.warningMessage')}</p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('accountDeletion.cancelButton')}
        </Button>
        <Button variant="destructive" onClick={handleNext} className="flex-1">
          {t('accountDeletion.continueButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Step 2: Reason Selection
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('accountDeletion.selectReasonTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('accountDeletion.selectReasonSubtitle')}</p>
      </div>

      <RadioGroup value={selectedReason || ""} onValueChange={(value) => setSelectedReason(value as DeletionReason)}>
        <div className="space-y-3">
          {deletionReasons.map((reason) => (
            <div key={reason} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value={reason} id={reason} />
              <Label htmlFor={reason} className="flex-1 cursor-pointer">
                {t(`accountDeletion.reasons.${reason}`)}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('accountDeletion.backButton')}
        </Button>
        <Button onClick={handleNext} className="flex-1">
          {t('accountDeletion.nextButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Step 3: Retention Suggestions
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('accountDeletion.retentionTitle')}</h3>

        {selectedReason && (
          <div className="bg-muted/50 border border-primary/20 rounded-lg p-4">
            <p className="text-sm leading-relaxed">
              {t(`accountDeletion.retentionSuggestions.${selectedReason}`)}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('accountDeletion.backButton')}
        </Button>
        <Button variant="default" onClick={handleStayAccount} className="flex-1">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t('accountDeletion.stayButton')}
        </Button>
        <Button variant="destructive" onClick={handleNext} className="flex-1">
          {t('accountDeletion.proceedButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Step 4: Custom Feedback
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('accountDeletion.feedbackTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('accountDeletion.feedbackSubtitle')}</p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={customFeedback}
          onChange={(e) => setCustomFeedback(e.target.value.slice(0, 500))}
          placeholder={t('accountDeletion.feedbackPlaceholder')}
          className="min-h-[120px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {customFeedback.length}/500 {t('accountDeletion.feedbackMaxLength')}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('accountDeletion.backButton')}
        </Button>
        <Button variant="outline" onClick={handleNext} className="flex-1">
          {t('accountDeletion.skipButton')}
        </Button>
        <Button onClick={handleNext} className="flex-1">
          {t('accountDeletion.nextButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Step 5: Security Confirmation
  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('accountDeletion.confirmTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('accountDeletion.confirmSubtitle')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="confirmEmail">{t('accountDeletion.emailLabel')}</Label>
          <Input
            id="confirmEmail"
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={t('accountDeletion.emailPlaceholder')}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('accountDeletion.passwordLabel')}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('accountDeletion.passwordPlaceholder')}
              className="pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-3 border rounded-lg p-4">
          <Checkbox
            id="confirmCheckbox"
            checked={confirmCheckbox}
            onCheckedChange={(checked) => setConfirmCheckbox(checked as boolean)}
          />
          <Label htmlFor="confirmCheckbox" className="text-sm leading-relaxed cursor-pointer">
            {t('accountDeletion.confirmCheckbox')}
          </Label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('accountDeletion.backButton')}
        </Button>
        <Button
          variant="destructive"
          onClick={handleNext}
          className="flex-1"
          disabled={!confirmEmail || !confirmPassword || !confirmCheckbox}
        >
          {t('accountDeletion.verifyButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Step 6: Final Confirmation (shown in dialog)
  const renderStep6 = () => (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <p className="font-semibold">{t('accountDeletion.finalTitle')}</p>
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">{t('accountDeletion.finalMessage')}</p>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {t('accountDeletion.deleteAccount')}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {t('accountDeletion.step')} {step} {t('accountDeletion.of')} {totalSteps}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
        </CardContent>
      </Card>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('accountDeletion.finalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                <p className="mb-4">{t('accountDeletion.finalMessage')}</p>
                <p className="font-semibold text-foreground">{t('accountDeletion.finalWarning')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFinalDialog(false)}>
              {t('accountDeletion.goBack')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('accountDeletion.deleting')}
                </>
              ) : (
                t('accountDeletion.confirmDelete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AccountDeletionFlow
