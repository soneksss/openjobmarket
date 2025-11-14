"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, ExternalLink } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/client"

export function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsAdmin(false)
          setLoading(false)
          return
        }

        // Check if user is admin by checking user_type in users table
        const { data: userData, error } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (error) {
          console.warn("Error checking admin status:", error)
          setIsAdmin(false)
        } else {
          setIsAdmin(userData?.user_type === 'admin')
        }
      } catch (error) {
        console.warn("Failed to check admin status:", error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  // Don't render anything while loading or if not admin
  if (loading || !isAdmin) {
    return null
  }

  return (
    <Button asChild className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">
      <Link href="/admin/dashboard" className="flex items-center space-x-2">
        <Shield className="h-4 w-4" />
        <span>Admin Page</span>
        <ExternalLink className="h-3 w-3" />
      </Link>
    </Button>
  )
}