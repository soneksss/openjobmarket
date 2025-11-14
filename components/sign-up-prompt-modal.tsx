"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { UserPlus, MessageCircle, Filter, LayoutDashboard } from "lucide-react"

interface SignUpPromptModalProps {
  isOpen: boolean
  onClose: () => void
  action?: "message" | "filter" | "dashboard"
  title?: string
  description?: string
}

export function SignUpPromptModal({
  isOpen,
  onClose,
  action = "message",
  title,
  description,
}: SignUpPromptModalProps) {
  const router = useRouter()

  const actionConfig = {
    message: {
      icon: MessageCircle,
      title: "Sign Up to Send Messages",
      description: "Create a free account to contact professionals and start conversations.",
    },
    filter: {
      icon: Filter,
      title: "Sign Up to Use Filters",
      description: "Create a free account to access advanced search filters and find exactly what you need.",
    },
    dashboard: {
      icon: LayoutDashboard,
      title: "Sign Up to Access Dashboard",
      description: "Create a free account to access your personalized dashboard and manage your profile.",
    },
  }

  const config = actionConfig[action]
  const Icon = config.icon

  const handleSignUp = () => {
    onClose()
    router.push("/auth/sign-up")
  }

  const handleLogin = () => {
    onClose()
    router.push("/auth/login")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {title || config.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description || config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSignUp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Create Free Account
          </Button>

          <Button
            onClick={handleLogin}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Already have an account? Log In
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          100% free to join. No credit card required.
        </p>
      </DialogContent>
    </Dialog>
  )
}
