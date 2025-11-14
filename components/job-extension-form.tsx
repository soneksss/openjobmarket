"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RefreshCw, AlertTriangle, CreditCard, CheckCircle, ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { extendJob } from "@/lib/job-expiration"
import PaymentModal from "./payment-modal"

interface Job {
  id: string
  title: string
  expires_at: string
  days_until_expiration: number
  expiration_status: string
  applications_count: number
  recruitment_timeline: string
  price: number
  created_at: string
  original_plan_type?: string
}

interface CompanyProfile {
  id: string
  company_name: string
}

interface JobExtensionFormProps {
  job: Job
  companyProfile: CompanyProfile
}

const TIMELINE_OPTIONS = [
  { value: "3_days", label: "3 days", price: 0, displayPrice: "Free" },
  { value: "7_days", label: "7 days", price: 0, displayPrice: "Free" },
  { value: "2_weeks", label: "2 weeks", price: 0, displayPrice: "Free" },
  { value: "3_weeks", label: "3 weeks", price: 0, displayPrice: "Free" },
  { value: "4_weeks", label: "4 weeks", price: 0, displayPrice: "Free" },
]

export default function JobExtensionForm({ job, companyProfile }: JobExtensionFormProps) {
  const router = useRouter()
  const [selectedTimeline, setSelectedTimeline] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOption = TIMELINE_OPTIONS.find((option) => option.value === selectedTimeline)
  const isExpired = job.expiration_status === "expired"
  const isExpiringSoon = job.expiration_status === "expiring_soon"

  const wasOriginallyFree = job.original_plan_type === "free" || job.price === 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateNewExpirationDate = () => {
    if (!selectedOption) return null

    const now = new Date()
    const daysToAdd =
      {
        "7_days": 7,
        "2_weeks": 14,
        "3_weeks": 21,
        "4_weeks": 28,
      }[selectedOption.value] || 7

    const newDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    return newDate
  }

  const handleExtend = () => {
    if (!selectedOption) return

    // All extensions are now free, no payment required
    setShowConfirmDialog(true)
  }

  const handlePaymentComplete = async (paymentData: any) => {
    await processExtension(paymentData)
  }

  const processExtension = async (paymentData?: any) => {
    if (!selectedOption) return

    setLoading(true)
    setError(null)

    try {
      const success = await extendJob(job.id, selectedOption.value, selectedOption.price)

      if (success) {
        const newExpirationDate = calculateNewExpirationDate()
        const daysExtended =
          {
            "7_days": 7,
            "2_weeks": 14,
            "3_weeks": 21,
            "4_weeks": 28,
          }[selectedOption.value] || 7

        alert(
          `Your job has been extended for ${daysExtended} days. New expiration: ${newExpirationDate?.toLocaleDateString()}.`,
        )
        router.push("/dashboard/company")
      } else {
        setError("Failed to extend job. Please try again.")
      }
    } catch (err) {
      console.error("Extension error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setShowPaymentModal(false)
    }
  }

  const getStatusAlert = () => {
    if (isExpired) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Job Expired:</strong> This job expired on {formatDate(job.expires_at)} and is no longer visible to
            candidates. Extend it to make it active again.
          </AlertDescription>
        </Alert>
      )
    } else if (isExpiringSoon) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Expiring Soon:</strong> This job expires in {job.days_until_expiration} day
            {job.days_until_expiration === 1 ? "" : "s"} on {formatDate(job.expires_at)}.
          </AlertDescription>
        </Alert>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/company">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Status Alert */}
      {getStatusAlert()}

      {/* Job Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Extend Job Posting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Job Title</p>
              <p className="font-medium">{job.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{companyProfile.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <Badge
                variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
                className={isExpiringSoon ? "bg-orange-100 text-orange-800" : ""}
              >
                {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Active"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applications Received</p>
              <p className="font-medium">{job.applications_count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Expiration</p>
              <p className="font-medium">{formatDate(job.expires_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Original Timeline</p>
              <p className="font-medium capitalize">{job.recruitment_timeline.replace("_", " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extension Options */}
      <Card>
        <CardHeader>
          <CardTitle>Select New Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how long you want to extend your job posting visibility
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Extension Policy:</strong> Extend your job posting for free to keep it visible to candidates.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            {TIMELINE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                  selectedTimeline === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="timeline"
                    value={option.value}
                    checked={selectedTimeline === option.value}
                    onChange={(e) => setSelectedTimeline(e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <span className="font-medium">{option.label}</span>
                    <p className="text-sm text-muted-foreground">Extend for {option.label.toLowerCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{option.displayPrice}</span>
                  {selectedTimeline === option.value && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
              </label>
            ))}
          </div>

          {selectedOption && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Extension Summary</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>New timeline:</span>
                      <span className="font-medium">{selectedOption.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New expiration date:</span>
                      <span className="font-medium">
                        {calculateNewExpirationDate()?.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-3 bg-blue-200" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What happens when you extend:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Job becomes active and visible on the job map</li>
                      <li>Candidates can apply and save the job</li>
                      <li>New expiration date is set based on selected timeline</li>
                      <li>You'll receive notifications before the new expiration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/company">Cancel</Link>
            </Button>
            <Button onClick={handleExtend} disabled={!selectedOption || loading} className="min-w-[120px]">
              <RefreshCw className="h-4 w-4 mr-2" />
              Extend Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPaymentModal && selectedOption && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          jobData={{
            title: job.title,
            recruitmentTimeline: selectedOption.value,
            price: selectedOption.price,
            locationText: "Extension",
            salaryMin: "0",
            salaryMax: "0",
            salaryFrequency: "per_year",
            jobTypes: ["Extension"],
          }}
          companyProfile={companyProfile}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Confirmation Dialog - kept for free extensions (though none exist now) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Job Extension</DialogTitle>
            <DialogDescription>
              Are you sure you want to extend "{job.title}" for {selectedOption?.label}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Timeline:</span>
                  <p className="font-medium">{selectedOption?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">New expiration:</span>
                  <p className="font-medium">
                    {calculateNewExpirationDate()?.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => processExtension()} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Extension
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
