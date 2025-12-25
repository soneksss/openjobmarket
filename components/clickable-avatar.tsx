"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ClickableAvatarProps {
  userId: string
  profilePhotoUrl?: string | null
  fallbackText: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  clickable?: boolean
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg"
}

export default function ClickableAvatar({
  userId,
  profilePhotoUrl,
  fallbackText,
  className,
  size = "md",
  clickable = true
}: ClickableAvatarProps) {
  const avatarContent = (
    <Avatar className={cn(sizeClasses[size], className, clickable && "cursor-pointer transition-transform hover:scale-105")}>
      <AvatarImage src={profilePhotoUrl || undefined} alt={fallbackText} />
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  )

  if (!clickable) {
    return avatarContent
  }

  return (
    <Link href={`/profile/${userId}`} className="inline-block">
      {avatarContent}
    </Link>
  )
}
