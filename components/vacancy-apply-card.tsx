"use client"

// Apply box on a vacancy page. Signed-out visitors create a quick personal
// account (or sign in) and come straight back here; signed-in people send a
// short message to the employer with their CV attached. No jobseeker profile needed.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/client"
import { CheckCircle2, FileText, Loader2, Paperclip, Send, X } from "lucide-react"

const MAX_CV_BYTES = 4 * 1024 * 1024
const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type Props = {
  vacancyId: string
  vacancyTitle: string
  companyName: string | null
  userId: string | null
  userType: string | null
  isOwner: boolean
  autoFocus?: boolean
}

export function VacancyApplyCard({ vacancyId, vacancyTitle, companyName, userId, userType, isOwner, autoFocus }: Props) {
  const [message, setMessage] = useState(`Hi, I'd like to apply for the ${vacancyTitle} role. `)
  const [cv, setCv] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)   // conversation id once applied
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const returnTo = `/jobs/${vacancyId}?apply=true`
  const signUpHref = `/auth/sign-up?source=quickcheck&accountType=individual&returnUrl=${encodeURIComponent(returnTo)}`
  const signInHref = `/auth/login?returnUrl=${encodeURIComponent(returnTo)}`

  // Already applied? (own messages are readable under messages RLS)
  useEffect(() => {
    if (!userId) return
    createClient().from("messages").select("conversation_id")
      .eq("sender_id", userId).eq("job_id", vacancyId).eq("message_type", "vacancy_application")
      .limit(1).maybeSingle()
      .then(({ data }) => { if (data) { setAlreadyApplied(true); setSentTo(data.conversation_id) } })
  }, [userId, vacancyId])

  useEffect(() => {
    if (autoFocus && userId) textRef.current?.focus()
  }, [autoFocus, userId])

  const pickCv = (f: File | undefined) => {
    setError(null)
    if (!f) return
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "doc", "docx"].includes(ext ?? "")) { setError("Please attach a PDF or Word document."); return }
    if (f.size > MAX_CV_BYTES) { setError("Your CV must be 4 MB or smaller."); return }
    setCv(f)
  }

  const submit = async () => {
    setError(null)
    if (message.trim().length < 10) { setError("Please write a short message to the employer."); return }
    setSending(true)
    try {
      const body = new FormData()
      body.set("message", message.trim())
      if (cv) body.set("cv", cv)
      const res = await fetch(`/api/vacancies/${vacancyId}/apply`, { method: "POST", body, credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) setAlreadyApplied(true)
        setError(data.error ?? "Could not send your application. Please try again.")
        return
      }
      setSentTo(data.conversationId ?? null)
    } catch {
      setError("Could not send your application. Please check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  if (isOwner) return null

  const shell = "rounded-2xl bg-white text-slate-900 p-5 sm:p-6 shadow-xl shadow-black/20"

  if (!userId) {
    return (
      <div className={shell}>
        <h3 className="text-xl font-bold">Apply for this job</h3>
        <p className="mt-1 text-sm text-slate-600">
          Create a free account in under a minute, then send {companyName ?? "the employer"} a message with your CV.
          No long profile to fill in.
        </p>
        <Link href={signUpHref} className="mt-4 block w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-center text-base font-bold text-white">
          Create a free account to apply
        </Link>
        <p className="mt-3 text-center text-sm text-slate-500">
          Already have an account? <Link href={signInHref} className="font-semibold text-emerald-700 hover:underline">Sign in</Link>
        </p>
      </div>
    )
  }

  if (userType === "company") {
    return (
      <div className={shell}>
        <h3 className="text-lg font-bold">Applying for this job?</h3>
        <p className="mt-1 text-sm text-slate-600">
          You&apos;re signed in with a business account. Applications are sent from personal accounts, so please sign in with one to apply.
        </p>
      </div>
    )
  }

  if (sentTo || alreadyApplied) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold">{alreadyApplied ? "You've applied" : "Application sent"}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {companyName ?? "The employer"} will reply in your messages. You&apos;ll get a notification when they do.
            </p>
          </div>
        </div>
        {sentTo && (
          <Link href={`/messages/${sentTo}`} className="mt-4 block w-full rounded-xl border-2 border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Open conversation
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className={shell}>
      <h3 className="text-xl font-bold">Apply for this job</h3>
      <p className="mt-1 text-sm text-slate-600">Your message goes straight to {companyName ?? "the employer"}.</p>

      <label htmlFor="vacancy-apply-message" className="mt-4 block text-sm font-semibold text-slate-700">Your message</label>
      <textarea
        id="vacancy-apply-message"
        ref={textRef}
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={5}
        maxLength={3000}
        className="mt-1.5 w-full rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none p-3 text-sm resize-y bg-white text-slate-900 placeholder:text-slate-400"
        placeholder="Say a little about yourself and when you could start."
      />

      <div className="mt-3">
        <input ref={fileRef} type="file" accept={CV_ACCEPT} className="hidden" onChange={e => { pickCv(e.target.files?.[0]); e.target.value = "" }} />
        {cv ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate text-sm">{cv.name}</span>
            <button onClick={() => setCv(null)} aria-label="Remove CV" className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 py-3 text-sm font-semibold text-slate-600">
            <Paperclip className="w-4 h-4" /> Attach your CV <span className="font-normal text-slate-400">(PDF or Word, optional)</span>
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button onClick={submit} disabled={sending}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 py-3 text-base font-bold text-white">
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {sending ? "Sending…" : "Send application"}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Only {companyName ?? "this employer"} can see your CV.</p>
    </div>
  )
}
