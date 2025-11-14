"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Eye, AlertCircle, CheckCircle, Upload } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

interface CourseData {
  id: string | null
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
  created_by: string | null
}

interface CourseEditorProps {
  courseData: CourseData
  adminUserId: string
}

const difficultyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const categories = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "UI/UX Design",
  "Project Management",
  "Business Skills",
  "Marketing",
  "Personal Development"
]

export default function CourseEditor({ courseData, adminUserId }: CourseEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(courseData.title)
  const [description, setDescription] = useState(courseData.description)
  const [content, setContent] = useState(courseData.content)
  const [imageUrl, setImageUrl] = useState(courseData.image_url || "")
  const [category, setCategory] = useState(courseData.category || "")
  const [difficultyLevel, setDifficultyLevel] = useState(courseData.difficulty_level || "")
  const [durationHours, setDurationHours] = useState(courseData.duration_hours || 1)
  const [price, setPrice] = useState(courseData.price)
  const [isActive, setIsActive] = useState(courseData.is_active)
  const [isFeatured, setIsFeatured] = useState(courseData.is_featured)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSave = async () => {
    if (!title.trim()) {
      setMessage({ type: "error", text: "Title is required" })
      return
    }

    if (!content.trim()) {
      setMessage({ type: "error", text: "Content is required" })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        category: category || null,
        difficulty_level: difficultyLevel || null,
        duration_hours: durationHours,
        price: price,
        is_active: isActive,
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      }

      let result
      if (courseData.id) {
        // Update existing course
        result = await supabase
          .from("courses")
          .update(updateData)
          .eq("id", courseData.id)
      } else {
        // Create new course
        result = await supabase
          .from("courses")
          .insert({
            ...updateData,
            created_at: new Date().toISOString(),
            created_by: adminUserId,
          })
      }

      if (result.error) {
        throw result.error
      }

      setMessage({ type: "success", text: "Course saved successfully!" })

      // Refresh and redirect after a moment
      setTimeout(() => {
        router.push("/admin/content")
      }, 1500)
    } catch (error) {
      console.error("Error saving course:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save course"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!courseData.id) return

    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseData.id)

      if (error) {
        throw error
      }

      setMessage({ type: "success", text: "Course deleted successfully!" })

      setTimeout(() => {
        router.push("/admin/content")
      }, 1000)
    } catch (error) {
      console.error("Error deleting course:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete course"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content
          </Link>
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {message.type === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="edit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="edit">Edit Course</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter course title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the course"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty level" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={durationHours || ""}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value) || 0)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (£)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-url">Course Image URL</Label>
                  <Input
                    id="image-url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/course-image.jpg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="active">Course Status</Label>
                    <div className="text-sm text-gray-500">
                      {isActive ? "This course is visible to users" : "This course is hidden from users"}
                    </div>
                  </div>
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="featured">Featured Course</Label>
                    <div className="text-sm text-gray-500">
                      Featured courses are highlighted prominently
                    </div>
                  </div>
                  <Switch
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

                {courseData.id && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      Delete Course
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Course Content */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">Course Content (HTML) *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the full course content using HTML"
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  You can use HTML tags to format the course content. Include lessons, exercises, and resources.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href="/admin/content">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Course"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Course Preview</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {category && <span className="bg-gray-100 px-2 py-1 rounded">{category}</span>}
                {difficultyLevel && <span className="capitalize">{difficultyLevel} level</span>}
                {durationHours && <span>{durationHours}h duration</span>}
                <span className="font-medium text-green-600">{price === 0 ? "Free" : `£${price}`}</span>
              </div>
            </CardHeader>
            <CardContent>
              {imageUrl && (
                <div className="mb-6">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="prose max-w-none">
                <h1>{title}</h1>
                {description && <p className="lead text-lg text-gray-600">{description}</p>}
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}