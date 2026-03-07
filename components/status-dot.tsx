import { isOnline } from "@/lib/presence"

interface StatusDotProps {
  lastSeenAt?: string | null
  className?: string
}

export function StatusDot({ lastSeenAt, className = "" }: StatusDotProps) {
  const online = isOnline(lastSeenAt)
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
        online ? "bg-green-400" : "bg-gray-500"
      } ${className}`}
      title={online ? "Online" : "Offline"}
    />
  )
}
