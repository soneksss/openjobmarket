"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle, Trash2, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { AccountDeletionFlow } from "@/components/account-deletion-flow"
import { useTranslation } from "@/lib/i18n/context"

interface SecuritySettingsProps {
  userEmail: string
}

export function SecuritySettings({ userEmail }: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showDeletionFlow, setShowDeletionFlow] = useState(false)

  const { t } = useTranslation()
  const supabase = createClient()
  const router = useRouter()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: t('security.allFieldsRequired') })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: t('security.passwordMinLength') })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t('security.passwordsNoMatch') })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: "error", text: t('security.passwordMustDiffer') })
      return
    }

    setIsLoading(true)

    try {
      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (signInError) {
        setMessage({ type: "error", text: t('security.incorrectPassword') })
        setIsLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setMessage({ type: "error", text: updateError.message || t('security.unexpectedError') })
      } else {
        setMessage({ type: "success", text: t('security.passwordUpdateSuccess') })
        // Clear form
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      setMessage({ type: "error", text: t('security.unexpectedError') })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Email Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            {t('security.emailAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t('security.yourEmail')}
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('security.emailChangeMessage')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            {t('security.changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium">
                {t('security.currentPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('security.currentPasswordPlaceholder')}
                  className="pr-10"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                {t('security.newPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('security.newPasswordPlaceholder')}
                  className="pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('security.confirmNewPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('security.confirmPasswordPlaceholder')}
                  className="pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Message Alert */}
            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"}>
                {message.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('security.updatingPassword')}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {t('security.updatePassword')}
                </>
              )}
            </Button>

            {/* Password Requirements */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">{t('security.passwordRequirements')}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  {t('security.requirementMinLength')}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  {t('security.requirementDifferent')}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  {t('security.requirementStrong')}
                </li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Account */}
      {!showDeletionFlow ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {t('security.dangerZone')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('security.warningLabel')}</strong> {t('security.deletionWarning')}
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeletionFlow(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('security.deleteAccountButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AccountDeletionFlow
          userEmail={userEmail}
          onCancel={() => setShowDeletionFlow(false)}
        />
      )}
    </div>
  )
}

export default SecuritySettings
