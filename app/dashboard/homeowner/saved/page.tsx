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
        )
      `)
      .eq("homeowner_id", hp.id)
      .order("created_at", { ascending: false })

    saved = (data || []).filter((s: any) => s.professional_profiles)
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
              const p = s.professional_profiles
              const displayName = p.first_name || p.nickname
                ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname
                : "Tradesperson"

              return (
                <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                  <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-slate-700">
                    <AvatarImage src={p.profile_photo_url} />
                    <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{p.title}</p>
                    {p.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {p.location}
                      </p>
                    )}
                    {p.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.skills.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-md">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0" asChild>
                    <Link href={`/messages?new=${p.user_id}`}>
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
