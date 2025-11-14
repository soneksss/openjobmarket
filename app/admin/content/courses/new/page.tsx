import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import SimpleCourseEditor from "@/components/admin-simple-course-editor"

export default async function NewCoursePage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  // Default data for new course
  const courseData = {
    id: null,
    title: "",
    description: "",
    content: "", // Will store the course URL
    image_url: null,
    category: null,
    difficulty_level: null,
    duration_hours: 1,
    price: 0,
    is_active: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600 mt-2">
          Add a new educational course to the platform
        </p>
      </div>

      <SimpleCourseEditor courseData={courseData} adminUserId={adminUser.id} />
    </div>
  )
}