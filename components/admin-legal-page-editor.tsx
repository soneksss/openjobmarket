"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Eye, AlertCircle, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

interface LegalPageData {
  id: string | null
  page_type: string
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

interface LegalPageEditorProps {
  pageData: LegalPageData
  adminUserId: string
}

export default function LegalPageEditor({ pageData, adminUserId }: LegalPageEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(pageData.title)
  const [content, setContent] = useState(pageData.content)
  const [isActive, setIsActive] = useState(pageData.is_active)
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
        page_type: pageData.page_type,
        title: title.trim(),
        content: content.trim(),
        is_active: isActive,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      }

      let result
      if (pageData.id) {
        // Update existing page
        result = await supabase
          .from("legal_pages")
          .update(updateData)
          .eq("id", pageData.id)
      } else {
        // Create new page
        result = await supabase
          .from("legal_pages")
          .insert({
            ...updateData,
            created_at: new Date().toISOString(),
          })
      }

      if (result.error) {
        throw result.error
      }

      setMessage({ type: "success", text: "Legal page saved successfully!" })

      // Refresh the page data
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error("Error saving legal page:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save legal page"
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
          <Link href="/admin/legal-pages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Legal Pages
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
          <TabsTrigger value="edit">Edit Content</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter page title"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Page Status</Label>
                  <div className="text-sm text-gray-500">
                    {isActive ? "This page is visible to users" : "This page is hidden from users"}
                  </div>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">HTML Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter HTML content for this page"
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  You can use HTML tags to format the content. The content will be displayed as-is on the website.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href="/admin/legal-pages">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Page"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <p className="text-sm text-gray-600">
                This is how the content will appear to users on the website.
              </p>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none border rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}