"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
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

  const { t } = useTranslation()
  const supabase = createClient()
  const router = useRouter()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (signInError) {
        setMessage({ type: "error", text: t('security.incorrectPassword') })
        setIsLoading(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setMessage({ type: "error", text: updateError.message || t('security.unexpectedError') })
      } else {
        setMessage({ type: "success", text: t('security.passwordUpdateSuccess') })
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
    <div className="space-y-4">

      {/* Email Address */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-200">{t('security.emailAddress')}</p>
        </div>
        <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-xl border border-slate-600">
          <Mail className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-200">{userEmail}</span>
        </div>
        <p className="text-xs text-slate-500">{t('security.emailChangeMessage')}</p>
      </div>

      {/* Change Password */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold text-slate-200">{t('security.changePassword')}</p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-medium text-slate-400">
              {t('security.currentPassword')}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('security.currentPasswordPlaceholder')}
                className="pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500/50"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-medium text-slate-400">
              {t('security.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('security.newPasswordPlaceholder')}
                className="pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500/50"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-400">
              {t('security.confirmNewPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('security.confirmPasswordPlaceholder')}
                className="pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500/50"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "bg-green-950/40 border-green-800/50 text-green-300" : ""}>
              {message.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900 mr-2" />
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
          <div className="p-3 bg-slate-700/40 rounded-xl">
            <p className="text-xs font-medium mb-2 text-slate-300">{t('security.passwordRequirements')}</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-500 rounded-full" />
                {t('security.requirementMinLength')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-500 rounded-full" />
                {t('security.requirementDifferent')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-500 rounded-full" />
                {t('security.requirementStrong')}
              </li>
            </ul>
          </div>
        </form>
      </div>

    </div>
  )
}

export default SecuritySettings
