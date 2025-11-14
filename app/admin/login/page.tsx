"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/client"
import { Loader2 } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log('Login form submitted with email:', email)

    try {
      const supabase = createClient()

      console.log('Attempting sign in...')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Sign in result:', { signInError })
      if (signInError) throw signInError

      // Check if user has admin privileges and handle redirect
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Authentication failed")

      // For now, only allow the specific admin email
      if (user.email !== 'soneksss@gmail.com') {
        await supabase.auth.signOut()
        throw new Error("Access denied. Admin privileges required.")
      }

      console.log('Admin user authenticated:', user.email)

      // Update last login timestamp (commented out for now)
      // await supabase
      //   .from('admin_users')
      //   .update({ last_login: new Date().toISOString() })
      //   .eq('user_id', user.id)

      console.log('Redirecting to admin dashboard...')
      // Force direct navigation to admin dashboard
      window.location.href = "/admin/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@openjobmarket.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help accessing your account? Contact the main administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
