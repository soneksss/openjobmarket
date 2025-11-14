"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { manualLogout } from "@/hooks/use-auto-logout"

interface ImmediateLogoutProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg"
}

export function ImmediateLogout({ className, variant = "destructive", size = "sm" }: ImmediateLogoutProps) {
  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout? This will clear all your session data.")) {
      await manualLogout()
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Logout Now
    </Button>
  )
}