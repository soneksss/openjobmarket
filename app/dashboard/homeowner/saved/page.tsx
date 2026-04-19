export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BookmarkIcon, MapPin, ArrowLeft, MessageCircle, Search } from "lucide-react"
import Link from "next/link"

export default async function HomeownerSavedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get homeowner profile
  const { data: hp } = await supabase
    .from("homeowner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single()

  let saved: any[] = []

  if (hp) {
    const { data } = await supabase
      .from("saved_traders")
      .select(`
        id,
        created_at,
        professional_id,
        company_id,
        professional_profiles (
          id,
          user_id,
          first_name,
          last_name,
          nickname,
          title,
          location,
          profile_photo_url,
          skills,
          available_for_work,
          average_rating,
          reviews_count
        ),
        company_profiles (
          id,
          user_id,
          company_name,
          logo_url,
          industry,
          location,
          average_rating,
          reviews_count
        )
      `)
      .eq("homeowner_id", hp.id)
      .order("created_at", { ascending: false })

    saved = (data || []).filter((s: any) => s.professional_profiles || s.company_profiles)
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
            <Link href="/dashboard/homeowner">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            Saved Tradespeople
          </h1>
          <div className="w-16" />
        </div>

        <p className="text-sm text-slate-400 mb-4">
          {saved.length} {saved.length === 1 ? "tradesperson" : "tradespeople"} saved
        </p>

        {saved.length === 0 ? (
          <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-10 text-center">
            <BookmarkIcon className="h-12 w-12 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No tradespeople saved</h3>
            <p className="text-sm text-slate-500 mb-5">
              Browse tradespeople and tap "Save Tradesperson" to add them here.
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link href="/?tab=traders&autoSearch=true">
                <Search className="h-4 w-4 mr-2" />
                Find Tradespeople
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {saved.map((s: any) => {
              const isCompany = !!s.company_profiles
              const cp = s.company_profiles
              const pp = s.professional_profiles
              const displayName = isCompany
                ? (cp.company_name || "Tradesperson")
                : (`${pp.first_name || ''} ${pp.last_name || ''}`.trim() || pp.nickname || "Tradesperson")
              const avatar = isCompany ? cp.logo_url : pp.profile_photo_url
              const subtitle = isCompany ? cp.industry : pp.title
              const location = isCompany ? cp.location : pp.location
              const skills = isCompany ? [] : (pp.skills || [])
              const profileUserId = isCompany ? cp.user_id : pp.user_id
              const profileHref = isCompany ? `/companies/${cp.id}` : `/professionals/${pp.user_id}`

              return (
                <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                  <Link href={profileHref}>
                    <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-slate-700">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold">
                        {displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={profileHref}>
                      <p className="text-sm font-semibold text-white truncate hover:text-emerald-400 transition-colors">{displayName}</p>
                    </Link>
                    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                    {location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {location}
                      </p>
                    )}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {skills.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-md">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0" asChild>
                    <Link href={`/messages?new=${profileUserId}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
