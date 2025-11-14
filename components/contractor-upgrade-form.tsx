"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Briefcase, Building2, Users, CheckCircle } from "lucide-react"

interface ContractorUpgradeFormProps {
  userId: string
  contractorProfile: any
}

export function ContractorUpgradeForm({ userId, contractorProfile }: ContractorUpgradeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Call the database function to switch contractor to employer
      const { data: switchData, error: switchError } = await supabase
        .rpc("switch_contractor_to_employer", {
          user_id_param: userId
        })

      if (switchError) {
        console.error("Switch error:", switchError)
        throw new Error("Failed to upgrade account")
      }

      // Create company profile based on contractor profile
      const companyData = {
        user_id: userId,
        company_name: contractorProfile.company_name,
        description: contractorProfile.description,
        industry: contractorProfile.industry,
        location: contractorProfile.location,
        phone: contractorProfile.phone,
        website: contractorProfile.website,
        logo_url: contractorProfile.logo_url,
        open_for_business: true,
        is_hiring: true,
      }

      const { error: profileError } = await supabase
        .from("company_profiles")
        .insert(companyData)

      if (profileError) {
        console.error("Profile error:", profileError)
        throw profileError
      }

      // Redirect to employer/company dashboard
      router.push("/dashboard/company")
      router.refresh()
    } catch (err: any) {
      console.error("Upgrade error:", err)
      setError(err.message || "Failed to upgrade account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Unlock Job Posting
          </h1>
          <p className="text-gray-600">
            Upgrade to employer and start hiring workers for your projects
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center text-lg">
            <Sparkles className="w-5 h-5 mr-2" />
            What you'll get:
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Post Unlimited Jobs</p>
                <p className="text-sm text-gray-600">Hire professionals and workers for your projects</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Manage Applications</p>
                <p className="text-sm text-gray-600">Review and respond to candidate applications</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Build Your Team</p>
                <p className="text-sm text-gray-600">Hire employees and grow your business</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Keep Contractor Access</p>
                <p className="text-sm text-gray-600">Continue browsing homeowner tasks while hiring</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Your Current Profile:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-medium">Company:</span> {contractorProfile.company_name}</p>
            <p><span className="font-medium">Industry:</span> {contractorProfile.industry}</p>
            <p><span className="font-medium">Location:</span> {contractorProfile.location}</p>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            This information will be used for your employer profile. You can edit it later.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Upgrading...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Upgrade to Employer
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
