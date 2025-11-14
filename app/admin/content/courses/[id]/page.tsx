import { createClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect, notFound } from "next/navigation"
import SimpleCourseEditor from "@/components/admin-simple-course-editor"

interface CourseEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { id } = await params
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  const supabase = await createClient()

  // Fetch the specific course
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !course) {
    console.error("Error fetching course:", error)
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
        <p className="text-gray-600 mt-2">
          Update course "{course.title}"
        </p>
      </div>

      <SimpleCourseEditor courseData={course} adminUserId={adminUser.id} />
    </div>
  )
}