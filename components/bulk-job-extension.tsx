"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Clock, CreditCard, CheckCircle, AlertTriangle } from "lucide-react"
import { extendJob } from "@/lib/job-expiration"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  title: string
  expires_at: string
  days_until_expiration: number
  expiration_status: string
  applications_count: number
}

interface BulkJobExtensionProps {
  jobs: Job[]
}

const TIMELINE_OPTIONS = [
  { value: "3_days", label: "3 days", price: 0, displayPrice: "Free" },
  { value: "7_days", label: "7 days", price: 0, displayPrice: "Free" },
  { value: "2_weeks", label: "2 weeks", price: 0, displayPrice: "Free" },
  { value: "3_weeks", label: "3 weeks", price: 0, displayPrice: "Free" },
  { value: "4_weeks", label: "4 weeks", price: 0, displayPrice: "Free" },
]

export default function BulkJobExtension({ jobs }: BulkJobExtensionProps) {
  const router = useRouter()
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [selectedTimeline, setSelectedTimeline] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expiringJobs = jobs.filter(
    (job) => job.expiration_status === "expiring_soon" || job.expiration_status === "expired",
  )

  const selectedOption = TIMELINE_OPTIONS.find((option) => option.value === selectedTimeline)
  const totalCost = selectedJobs.length * (selectedOption?.price || 0)

  const handleJobToggle = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId])
    } else {
      setSelectedJobs(selectedJobs.filter((id) => id !== jobId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(expiringJobs.map((job) => job.id))
    } else {
      setSelectedJobs([])
    }
  }

  const handleBulkExtend = async () => {
    if (!selectedOption || selectedJobs.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const results = await Promise.allSettled(
        selectedJobs.map((jobId) => extendJob(jobId, selectedOption.value, selectedOption.price)),
      )

      const failures = results.filter((result) => result.status === "rejected" || !result.value)

      if (failures.length > 0) {
        setError(`Failed to extend ${failures.length} job(s). Please try again.`)
      } else {
        setShowDialog(false)
        router.refresh()
      }
    } catch (err) {
      console.error("Bulk extension error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (expiringJobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2" />
          Bulk Job Extension
        </CardTitle>
        <p className="text-sm text-muted-foreground">Extend multiple jobs at once to keep them visible to candidates</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedJobs.length === expiringJobs.length}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select all expiring jobs ({expiringJobs.length})
          </label>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {expiringJobs.map((job) => (
            <div key={job.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id={job.id}
                checked={selectedJobs.includes(job.id)}
                onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
              />
              <div className="flex-1">
                <p className="font-medium">{job.title}</p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Expires {formatDate(job.expires_at)}
                  </span>
                  <Badge
                    variant={job.expiration_status === "expired" ? "destructive" : "secondary"}
                    className={job.expiration_status === "expiring_soon" ? "bg-orange-100 text-orange-800" : ""}
                  >
                    {job.expiration_status === "expired" ? "Expired" : "Expiring Soon"}
                  </Badge>
                  <span>{job.applications_count} applications</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedJobs.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">Extension Timeline</label>
              <Select value={selectedTimeline} onValueChange={setSelectedTimeline}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeline for all selected jobs" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button disabled={!selectedOption} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Extend {selectedJobs.length} Job{selectedJobs.length === 1 ? "" : "s"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Bulk Extension</DialogTitle>
                  <DialogDescription>
                    Extend {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"} for {selectedOption?.label}?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Jobs selected:</span>
                        <p className="font-medium">{selectedJobs.length}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeline:</span>
                        <p className="font-medium">{selectedOption?.label}</p>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkExtend} disabled={loading}>
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
        )}
      </CardContent>
    </Card>
  )
}
