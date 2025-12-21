import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Heart, MapPin, Star } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default async function SavedTradersPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get saved traders (this would need a saved_traders table in the database)
  // For now, we'll show a placeholder
  const savedTraders: any[] = []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/account/homeowner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 w-4 mr-1" />
              Back to Account Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Tradespeople</h1>
            <p className="text-gray-600">Professionals and contractors you've saved for later</p>
          </div>
          <Heart className="h-8 w-8 text-red-500" />
        </div>

        {savedTraders.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Tradespeople Yet</h3>
            <p className="text-gray-600 mb-6">
              When you find tradespeople you like, click the heart icon to save them here for easy access later.
            </p>
            <Button asChild>
              <Link href="/?tab=traders">
                Browse Tradespeople
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {savedTraders.map((trader) => (
              <Card key={trader.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={trader.profile_photo_url} />
                      <AvatarFallback>
                        {trader.first_name[0]}{trader.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {trader.first_name} {trader.last_name}
                      </h3>
                      <p className="text-gray-600 mb-2">{trader.title}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{trader.location}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trader.skills?.slice(0, 3).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">View Profile</Button>
                    <Button size="sm" variant="outline">
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
