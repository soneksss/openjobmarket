// Server component — handles auth server-side, no client-side auth check needed
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import NewMessageForm from "./new-message-form"

interface PageProps {
  searchParams: Promise<{ recipient?: string; jobId?: string; subject?: string; returnUrl?: string }>
}

export default async function NewMessagePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const params = await searchParams
  const recipientId = params.recipient ?? ""
  const jobId = params.jobId ?? null
  const subject = params.subject ?? ""
  const returnUrl = params.returnUrl ? decodeURIComponent(params.returnUrl) : null

  return (
    <NewMessageForm
      userId={user.id}
      recipientId={recipientId}
      jobId={jobId}
      initialSubject={subject}
      returnUrl={returnUrl}
    />
  )
}
