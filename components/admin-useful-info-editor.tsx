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
import { ArrowLeft, Save, Eye, AlertCircle, CheckCircle, Tag, X, Plus } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

interface UsefulInfoData {
  id: string | null
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
  created_by: string | null
}

interface UsefulInfoEditorProps {
  infoData: UsefulInfoData
  adminUserId: string
}

const categories = [
  "Career Advice",
  "Interview Tips",
  "Resume Writing",
  "Networking",
  "Salary Negotiation",
  "Job Search",
  "Professional Development",
  "Industry Insights",
  "Work-Life Balance",
  "Skills Development",
  "Remote Work",
  "Freelancing"
]

export default function UsefulInfoEditor({ infoData, adminUserId }: UsefulInfoEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(infoData.title)
  const [description, setDescription] = useState(infoData.description)
  const [content, setContent] = useState(infoData.content)
  const [imageUrl, setImageUrl] = useState(infoData.image_url || "")
  const [category, setCategory] = useState(infoData.category || "")
  const [tags, setTags] = useState<string[]>(infoData.tags || [])
  const [newTag, setNewTag] = useState("")
  const [externalUrl, setExternalUrl] = useState(infoData.external_url || "")
  const [isActive, setIsActive] = useState(infoData.is_active)
  const [isFeatured, setIsFeatured] = useState(infoData.is_featured)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

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
        tags: tags.length > 0 ? tags : null,
        external_url: externalUrl.trim() || null,
        is_active: isActive,
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      }

      let result
      if (infoData.id) {
        // Update existing info
        result = await supabase
          .from("useful_info")
          .update(updateData)
          .eq("id", infoData.id)
      } else {
        // Create new info
        result = await supabase
          .from("useful_info")
          .insert({
            ...updateData,
            created_at: new Date().toISOString(),
            created_by: adminUserId,
          })
      }

      if (result.error) {
        throw result.error
      }

      setMessage({ type: "success", text: "Information saved successfully!" })

      // Refresh and redirect after a moment
      setTimeout(() => {
        router.push("/admin/content")
      }, 1500)
    } catch (error) {
      console.error("Error saving useful info:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save information"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!infoData.id) return

    if (!confirm("Are you sure you want to delete this information? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("useful_info")
        .delete()
        .eq("id", infoData.id)

      if (error) {
        throw error
      }

      setMessage({ type: "success", text: "Information deleted successfully!" })

      setTimeout(() => {
        router.push("/admin/content")
      }, 1000)
    } catch (error) {
      console.error("Error deleting useful info:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete information"
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
          <TabsTrigger value="edit">Edit Information</TabsTrigger>
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
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter information title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this information"
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
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <div
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center space-x-1"
                      >
                        <Tag className="h-3 w-3" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id="tags"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add a tag"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Press Enter or click + to add tags
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input
                    id="image-url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="external-url">External Link (Optional)</Label>
                  <Input
                    id="external-url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com/article"
                  />
                  <p className="text-sm text-gray-500">
                    Link to external resource or website
                  </p>
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
                    <Label htmlFor="active">Information Status</Label>
                    <div className="text-sm text-gray-500">
                      {isActive ? "This information is visible to users" : "This information is hidden from users"}
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
                    <Label htmlFor="featured">Featured Information</Label>
                    <div className="text-sm text-gray-500">
                      Featured information is highlighted prominently
                    </div>
                  </div>
                  <Switch
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

                {infoData.id && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 mb-2">
                      Views: {infoData.view_count || 0}
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      Delete Information
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">Content (HTML) *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the full content using HTML"
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  You can use HTML tags to format the content. Include helpful information, tips, and resources.
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
              {loading ? "Saving..." : "Save Information"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Information Preview</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {category && <span className="bg-gray-100 px-2 py-1 rounded">{category}</span>}
                {tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>{tags.join(", ")}</span>
                  </div>
                )}
                {externalUrl && <span className="text-blue-600">External link</span>}
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

                {externalUrl && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">External Resource:</p>
                    <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {externalUrl}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}