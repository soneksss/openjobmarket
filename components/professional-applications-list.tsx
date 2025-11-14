"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Briefcase, MapPin, Calendar, Eye, Trash2 } from "lucide-react"
import Link from "next/link"

interface Application {
  id: string
  professional_id: string
  status: string
  applied_at: string
  jobs: {
    id: string
    title: string
    location: string
    job_type: string
    salary_min?: number
    salary_max?: number
    company_profiles: {
      company_name: string
      logo_url?: string
      user_id: string
    }
  }
}

interface ProfessionalApplicationsListProps {
  applications: Application[]
  professionalId: string
}

export default function ProfessionalApplicationsList({
  applications,
  professionalId,
}: ProfessionalApplicationsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleWithdraw = async (applicationId: string, employerUserId: string) => {
    setWithdrawingId(applicationId)
    try {
      console.log("[WITHDRAW] Withdrawing application:", applicationId)

      // Delete the application
      const { error: deleteError } = await supabase.from("job_applications").delete().eq("id", applicationId)

      if (deleteError) {
        console.error("[WITHDRAW] Error deleting application:", deleteError)
        alert("Failed to withdraw application. Please try again.")
        return
      }

      console.log("[WITHDRAW] Application deleted successfully")

      // Delete privacy permission if it exists
      const { error: privacyError } = await supabase
        .from("employer_privacy_permissions")
        .delete()
        .eq("professional_id", professionalId)
        .eq("employer_id", employerUserId)

      if (privacyError) {
        console.warn("[WITHDRAW] Error deleting privacy permission:", privacyError)
        // Don't fail the whole operation if privacy deletion fails
      } else {
        console.log("[WITHDRAW] Privacy permission deleted successfully")
      }

      // Refresh the page to show updated list
      router.refresh()
    } catch (error) {
      console.error("[WITHDRAW] Error withdrawing application:", error)
      alert("Failed to withdraw application. Please try again.")
    } finally {
      setWithdrawingId(null)
    }
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">You haven't applied to any jobs yet.</p>
        <Button asChild>
          <Link href="/jobs">Browse Jobs</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <Card key={application.id} className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  {application.jobs.company_profiles.logo_url && (
                    <img
                      src={application.jobs.company_profiles.logo_url}
                      alt={application.jobs.company_profiles.company_name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <CardTitle className="text-xl mb-1">{application.jobs.title}</CardTitle>
                    <p className="text-muted-foreground mb-2">{application.jobs.company_profiles.company_name}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {application.jobs.location}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Applied {formatDate(application.applied_at)}
                      </span>
                      <span className="capitalize">{application.jobs.job_type.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Badge className={getStatusColor(application.status)} variant="secondary">
                {application.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {application.jobs.salary_min && application.jobs.salary_max && (
                  <span>
                    Salary: £{application.jobs.salary_min.toLocaleString()} - £
                    {application.jobs.salary_max.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/applications/${application.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
                {(application.status === "pending" || application.status === "reviewed") && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={withdrawingId === application.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {withdrawingId === application.id ? "Withdrawing..." : "Withdraw"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to withdraw your application for {application.jobs.title} at{" "}
                          {application.jobs.company_profiles.company_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleWithdraw(application.id, application.jobs.company_profiles.user_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Withdraw Application
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
