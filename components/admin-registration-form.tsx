"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, AlertCircle, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

interface AdminRegistrationFormProps {
  user: {
    id: string
    email: string
  }
  existingUser?: {
    user_type: string
  } | null
}

export default function AdminRegistrationForm({ user, existingUser }: AdminRegistrationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    adminCode: "",
    justification: "",
    permissions: ["manage_users", "manage_jobs", "view_analytics"] as string[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("Starting admin registration process...")

      // Validate admin code
      if (formData.adminCode !== "OPENJOBMARKET_ADMIN_2024") {
        throw new Error("Invalid admin registration code")
      }

      if (!formData.fullName.trim()) {
        throw new Error("Full name is required")
      }

      console.log("Validation passed, creating admin user...")

      // Create admin user in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .insert({
          user_id: user.id,
          role: "super_admin",
          permissions: formData.permissions,
          full_name: formData.fullName,
          registration_code: formData.adminCode,
          justification: formData.justification
        })
        .select()

      if (adminError) {
        console.error("Admin creation error:", adminError)
        throw new Error(`Failed to create admin user: ${adminError.message}`)
      }

      console.log("Admin user created successfully:", adminData)
      setSuccess(true)

      // Redirect to admin dashboard after a brief delay
      setTimeout(() => {
        router.push("/admin/dashboard")
      }, 2000)

    } catch (error) {
      console.error("Admin registration error:", error)
      setError(error instanceof Error ? error.message : "Failed to register admin")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Admin Registration Successful!
            </h3>
            <p className="text-green-700 mb-4">
              You are now registered as a super administrator.
            </p>
            <p className="text-sm text-green-600">
              Redirecting to admin dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-blue-800">
            <Shield className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Current User: {user.email}</p>
              <p className="text-xs text-blue-600">
                {existingUser ? `Current type: ${existingUser.user_type}` : "New user"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          placeholder="Enter your full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminCode">Admin Registration Code</Label>
        <Input
          id="adminCode"
          type="password"
          value={formData.adminCode}
          onChange={(e) => setFormData(prev => ({ ...prev, adminCode: e.target.value }))}
          placeholder="Enter admin registration code"
          required
        />
        <p className="text-xs text-gray-600">
          For this demo, use: <code className="bg-gray-100 px-1 rounded">OPENJOBMARKET_ADMIN_2024</code>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="justification">Justification (Optional)</Label>
        <Textarea
          id="justification"
          value={formData.justification}
          onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
          placeholder="Why do you need admin access?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Default Permissions</Label>
        <div className="text-sm text-gray-600 space-y-1">
          <div>✓ Manage Users</div>
          <div>✓ Manage Jobs</div>
          <div>✓ View Analytics</div>
          <div>✓ Super Admin (Full Access)</div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Registering..." : "Register as Admin"}
      </Button>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-sm text-gray-600"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}