"use client"

import { useState } from "react"
import { X, Flag, AlertTriangle, Shield, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/client"

type ReportType = "scam" | "bullying" | "harassment"

interface ReportUserModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId: string
  reportedUserName: string
  messageId?: string
  conversationId?: string
  reporterId: string
}

export default function ReportUserModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  messageId,
  conversationId,
  reporterId,
}: ReportUserModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const reportTypes = [
    {
      type: "scam" as ReportType,
      label: "Scam",
      icon: AlertTriangle,
      description: "Fraudulent activity, fake profiles, or financial scams",
      color: "bg-red-50 border-red-200 text-red-800",
    },
    {
      type: "bullying" as ReportType,
      label: "Bullying",
      icon: Shield,
      description: "Intimidation, threats, or aggressive behavior",
      color: "bg-orange-50 border-orange-200 text-orange-800",
    },
    {
      type: "harassment" as ReportType,
      label: "Harassment",
      icon: MessageSquare,
      description: "Unwanted contact, spam, or inappropriate messages",
      color: "bg-purple-50 border-purple-200 text-purple-800",
    },
  ]

  const handleSubmitReport = async () => {
    if (!selectedType) {
      setError("Please select a report type")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: reportError } = await supabase.from("user_reports").insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        message_id: messageId,
        conversation_id: conversationId,
        report_type: selectedType,
        report_reason: reason.trim() || null,
      })

      if (reportError) {
        console.error("Error submitting report:", reportError)
        if (reportError.message.includes("unique_report_per_message")) {
          setError("You have already reported this user for this message.")
        } else {
          setError("Failed to submit report. Please try again.")
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error("Exception submitting report:", err)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSelectedType(null)
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
              <Flag className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Submitted</h3>
            <p className="text-sm text-gray-500">
              Thank you for reporting this user. Our team will review your report and take appropriate action.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Flag className="h-5 w-5 text-red-600" />
            <span>Report User</span>
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
            <h3 className="text-lg font-medium mb-2">
              Report {reportedUserName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Please select the reason for reporting this user. Your report will be reviewed by our moderation team.
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

          {/* Report Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              What type of behavior are you reporting?
            </label>
            <div className="space-y-2">
              {reportTypes.map((type) => {
                const Icon = type.icon
                const isSelected = selectedType === type.type
                return (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    disabled={loading}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? `${type.color} border-current`
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? "text-current" : "text-gray-500"}`} />
                      <div className="flex-1">
                        <div className="font-medium">{type.label}</div>
                        <div className={`text-sm ${isSelected ? "text-current opacity-80" : "text-gray-500"}`}>
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional Details */}
          {selectedType && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional details (optional)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide any additional context about this report..."
                rows={3}
                disabled={loading}
                className="w-full resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {reason.length}/500 characters
              </p>
            </div>
          )}

          {/* Warning */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important:</p>
                  <p>
                    False reports may result in action against your account. Please only report genuine
                    violations of our community guidelines.
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
              onClick={handleSubmitReport}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={!selectedType || loading}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}