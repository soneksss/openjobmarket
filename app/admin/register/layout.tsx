import type React from "react"

interface AdminRegisterLayoutProps {
  children: React.ReactNode
}

export default function AdminRegisterLayout({ children }: AdminRegisterLayoutProps) {
  // This layout bypasses the admin authentication check
  // allowing access to the register page without being an admin
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}