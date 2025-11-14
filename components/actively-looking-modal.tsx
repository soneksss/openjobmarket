"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Clock, Zap, AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ActivelyLookingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (days: number) => Promise<void>
  isPremium?: boolean
}

export default function ActivelyLookingModal({ isOpen, onClose, onConfirm, isPremium = false }: ActivelyLookingModalProps) {
  const [selectedDays, setSelectedDays] = useState<string>("3")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const durationOptions = [
    {
      value: "1",
      label: "1 Day",
      description: "Perfect for urgent job search",
      icon: "⚡",
    },
    {
      value: "3",
      label: "3 Days",
      description: "Recommended for active searching",
      icon: "🎯",
      recommended: true,
    },
    {
      value: "5",
      label: "5 Days",
      description: "Extended visibility period",
      icon: "🚀",
    },
    {
      value: "7",
      label: "7 Days",
      description: "Maximum visibility duration",
      icon: "⭐",
      premium: true,
    },
  ]

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(parseInt(selectedDays))
      onClose()
    } catch (error) {
      console.error("[ACTIVELY-LOOKING-MODAL] Error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-full">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Enable "Actively Looking"</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Choose how long you want to appear as actively looking for opportunities. You'll need to renew this status after it expires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Stay Active to Stay Visible</p>
                <p className="text-blue-700">
                  Employers see professionals who are actively engaged. You'll need to manually renew your status when it expires to ensure you're actively seeking opportunities.
                </p>
              </div>
            </div>
          </div>

          {/* Duration Selection */}
          <RadioGroup value={selectedDays} onValueChange={setSelectedDays}>
            <div className="space-y-3">
              {durationOptions.map((option) => {
                const isLocked = option.premium && !isPremium

                return (
                  <div
                    key={option.value}
                    className={`relative ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-50 ${
                        selectedDays === option.value && !isLocked
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200"
                      } ${isLocked ? 'cursor-not-allowed' : ''}`}
                      onClick={() => !isLocked && setSelectedDays(option.value)}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="mt-1"
                        disabled={isLocked}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={option.value}
                          className={`flex items-center gap-2 text-base font-semibold cursor-pointer ${
                            isLocked ? 'cursor-not-allowed' : ''
                          }`}
                        >
                          <span className="text-2xl">{option.icon}</span>
                          <span>{option.label}</span>
                          {option.recommended && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                              Recommended
                            </Badge>
                          )}
                          {option.premium && !isPremium && (
                            <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-xs">
                              Premium Only
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </RadioGroup>

          {/* Benefits List */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm text-gray-900 mb-3">
              What you get with "Actively Looking":
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Priority Visibility</span> - Appear at the top of employer searches
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Bold Profile Name</span> - Stand out with enhanced visibility
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Green Indicator</span> - Show employers you're ready to work
                </p>
              </div>
              {isPremium && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Extended Duration</span> - Premium members can stay active for 7 days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Expiration Notice */}
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Your status will automatically expire after{" "}
              <span className="font-semibold text-gray-900">
                {durationOptions.find(o => o.value === selectedDays)?.label.toLowerCase()}
              </span>
              . You'll receive a notification and can renew it anytime from your dashboard.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Activate for {durationOptions.find(o => o.value === selectedDays)?.label}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
