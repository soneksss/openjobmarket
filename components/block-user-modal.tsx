"use client"

import { useState } from "react"
import { X, Shield, AlertTriangle, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/client"

interface BlockUserModalProps {
  isOpen: boolean
  onClose: () => void
  userToBlockId: string
  userToBlockName: string
  blockerId: string
  onBlockSuccess?: () => void
}

export default function BlockUserModal({
  isOpen,
  onClose,
  userToBlockId,
  userToBlockName,
  blockerId,
  onBlockSuccess,
}: BlockUserModalProps) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleBlockUser = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: blockError } = await supabase.from("blocked_users").insert({
        blocker_id: blockerId,
        blocked_user_id: userToBlockId,
        reason: reason.trim() || null,
        blocked_by_admin: false,
      })

      if (blockError) {
        console.error("Error blocking user:", blockError)
        if (blockError.message.includes("unique_active_block")) {
          setError("You have already blocked this user.")
        } else {
          setError("Failed to block user. Please try again.")
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      onBlockSuccess?.()
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error("Exception blocking user:", err)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason("")
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  if (!isOpen) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Blocked</h3>
            <p className="text-sm text-gray-500">
              {userToBlockName} has been blocked. They will no longer be able to send you messages.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Ban className="h-5 w-5 text-red-600" />
            <span>Block User</span>
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2 text-red-900">
              Block {userToBlockName}?
            </h3>
            <p className="text-sm text-muted-foreground">
              This will prevent them from sending you messages and you won't be able to message them.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Block Effects */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-4">
              <h4 className="font-medium text-gray-900 mb-2">What happens when you block someone:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• They won't be able to send you messages</li>
                <li>• You won't be able to send them messages</li>
                <li>• Existing conversations will remain but no new messages can be sent</li>
                <li>• You can unblock them later if you change your mind</li>
                <li>• They won't be notified that you blocked them</li>
              </ul>
            </CardContent>
          </Card>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Reason for blocking (optional, for your reference)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you blocking this user? (This is private and won't be shared)"
              rows={3}
              disabled={loading}
              className="w-full resize-none"
              maxLength={300}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/300 characters
            </p>
          </div>

          {/* Warning */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Consider reporting instead:</p>
                  <p>
                    If this user is violating our community guidelines, consider reporting them as well.
                    This helps protect other users too.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockUser}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Blocking..." : "Block User"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}