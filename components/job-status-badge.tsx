"use client"

import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n/use-translation"

export type JobStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'failed'

interface JobStatusBadgeProps {
  status: JobStatus
  className?: string
}

export function JobStatusBadge({ status, className = "" }: JobStatusBadgeProps) {
  const { t } = useTranslation()

  const config = {
    open: {
      color: 'bg-green-100 text-green-800 border-green-300',
      label: t('jobs.statusOpen')
    },
    accepted: {
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: t('jobs.statusAccepted')
    },
    in_progress: {
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      label: t('jobs.statusInProgress')
    },
    completed: {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: t('jobs.statusCompleted')
    },
    failed: {
      color: 'bg-red-100 text-red-800 border-red-300',
      label: t('jobs.statusFailed')
    }
  }

  const { color, label } = config[status]

  return (
    <Badge className={`${color} ${className}`} variant="outline">
      {label}
    </Badge>
  )
}
