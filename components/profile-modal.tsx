"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import ProfessionalDetailView from "./professional-detail-view"
import CompanyDetailView from "./company-detail-view"
import ContractorDetailView from "./contractor-detail-view"
import HomeownerDetailView from "./homeowner-detail-view"
import { Loader2 } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileType: "professional" | "company" | "contractor" | "homeowner"
  profileId: string
}

export default function ProfileModal({ isOpen, onClose, profileType, profileId }: ProfileModalProps) {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile()
      fetchCurrentUser()
    }
  }, [isOpen, profileId, profileType])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()
      setUserType(userData?.user_type || null)
    }
  }

  const fetchProfile = async () => {
    setLoading(true)
    console.log("[PROFILE-MODAL] Fetching profile:", { profileType, profileId })
    try {
      let data, error

      switch (profileType) {
        case "professional":
          ({ data, error } = await supabase
            .from("professional_profiles")
            .select("*")
            .eq("id", profileId)
            .single())
          break
        case "company":
          ({ data, error } = await supabase
            .from("company_profiles")
            .select("*")
            .eq("id", profileId)
            .single())
          break
        case "contractor":
          ({ data, error } = await supabase
            .from("contractor_profiles")
            .select("*")
            .eq("id", profileId)
            .single())
          break
        case "homeowner":
          ({ data, error } = await supabase
            .from("homeowner_profiles")
            .select("*")
            .eq("id", profileId)
            .single())
          break
      }

      console.log("[PROFILE-MODAL] Fetch result:", { data, error })
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("[PROFILE-MODAL] Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  // Get title for accessibility
  const getDialogTitle = () => {
    if (loading) return "Loading profile..."
    if (!profile) return "Profile not found"
    switch (profileType) {
      case "professional":
        return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Professional Profile"
      case "company":
        return profile.company_name || "Company Profile"
      case "contractor":
        return profile.company_name || "Contractor Profile"
      case "homeowner":
        return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Homeowner Profile"
      default:
        return "Profile"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </VisuallyHidden>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="relative">
            {profileType === "professional" && (
              <ProfessionalDetailView
                professional={profile}
                user={user}
                userType={userType as any}
                isModal={true}
              />
            )}
            {profileType === "company" && (
              <CompanyDetailView
                company={profile}
                user={user}
                isModal={true}
              />
            )}
            {profileType === "contractor" && (
              <ContractorDetailView
                contractor={profile}
                user={user}
                userType={userType}
                isModal={true}
              />
            )}
            {profileType === "homeowner" && (
              <HomeownerDetailView
                homeowner={profile}
                user={user}
                userType={userType}
                isModal={true}
              />
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            Profile not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
