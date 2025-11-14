import { createClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Edit, Eye, EyeOff, Plus, GraduationCap, BookOpen, Star, Clock } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  description: string
  content: string
  image_url: string | null
  category: string | null
  difficulty_level: string | null
  duration_hours: number | null
  price: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  created_by: string
}

interface UsefulInfo {
  id: string
  title: string
  description: string
  content: string
  category: string | null
  tags: string[] | null
  image_url: string | null
  external_url: string | null
  is_active: boolean
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at: string
  created_by: string
}

export default async function AdminContentPage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  const supabase = await createClient()

  // Fetch courses and useful info
  const [coursesResult, usefulInfoResult] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("useful_info").select("*").order("created_at", { ascending: false })
  ])

  if (coursesResult.error) {
    console.error("Error fetching courses:", coursesResult.error)
  }

  if (usefulInfoResult.error) {
    console.error("Error fetching useful info:", usefulInfoResult.error)
  }

  const courses = coursesResult.data || []
  const usefulInfo = usefulInfoResult.data || []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `£${price.toFixed(2)}`
  }

  const formatDuration = (hours: number | null) => {
    if (!hours) return "Duration not set"
    if (hours < 1) return `${Math.round(hours * 60)} minutes`
    return hours === 1 ? "1 hour" : `${hours} hours`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-2">
          Manage courses and useful information content
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courses" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>Courses ({courses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="useful-info" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Useful Info ({usefulInfo.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Courses</h2>
              <p className="text-gray-600 text-sm">Manage educational courses and training materials</p>
            </div>
            <Button asChild>
              <Link href="/admin/content/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Link>
            </Button>
          </div>

          <div className="grid gap-6">
            {courses.length > 0 ? (
              courses.map((course: Course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3 flex-wrap">
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={course.is_active ? "default" : "secondary"}
                              className={course.is_active ? "bg-green-100 text-green-800" : ""}
                            >
                              <div className="flex items-center space-x-1">
                                {course.is_active ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                                <span>{course.is_active ? "Active" : "Inactive"}</span>
                              </div>
                            </Badge>
                            {course.is_featured && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>

                        {course.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {course.category && (
                            <span className="bg-gray-100 px-2 py-1 rounded">{course.category}</span>
                          )}
                          {course.difficulty_level && (
                            <span className="capitalize">{course.difficulty_level} level</span>
                          )}
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(course.duration_hours)}</span>
                          </div>
                          <span className="font-medium text-green-600">{formatPrice(course.price)}</span>
                        </div>

                        <div className="text-xs text-gray-500">
                          <p>Last updated: {formatDate(course.updated_at)}</p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/admin/content/courses/${course.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No courses found</p>
                  <Button asChild>
                    <Link href="/admin/content/courses/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Useful Info Tab */}
        <TabsContent value="useful-info" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Useful Information</h2>
              <p className="text-gray-600 text-sm">Manage helpful articles and resources for users</p>
            </div>
            <Button asChild>
              <Link href="/admin/content/useful-info/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Info
              </Link>
            </Button>
          </div>

          <div className="grid gap-6">
            {usefulInfo.length > 0 ? (
              usefulInfo.map((info: UsefulInfo) => (
                <Card key={info.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3 flex-wrap">
                          <CardTitle className="text-lg">{info.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={info.is_active ? "default" : "secondary"}
                              className={info.is_active ? "bg-green-100 text-green-800" : ""}
                            >
                              <div className="flex items-center space-x-1">
                                {info.is_active ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                                <span>{info.is_active ? "Active" : "Inactive"}</span>
                              </div>
                            </Badge>
                            {info.is_featured && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>

                        {info.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{info.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {info.category && (
                            <span className="bg-gray-100 px-2 py-1 rounded">{info.category}</span>
                          )}
                          {info.tags && info.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <span>Tags:</span>
                              <div className="flex space-x-1">
                                {info.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                                {info.tags.length > 3 && (
                                  <span className="text-gray-400">+{info.tags.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                          <span>{info.view_count || 0} views</span>
                        </div>

                        <div className="text-xs text-gray-500">
                          <p>Last updated: {formatDate(info.updated_at)}</p>
                          {info.external_url && (
                            <p>External link: <code className="bg-gray-100 px-1 py-0.5 rounded">{info.external_url}</code></p>
                          )}
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/admin/content/useful-info/${info.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No useful information found</p>
                  <Button asChild>
                    <Link href="/admin/content/useful-info/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Info Article
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}