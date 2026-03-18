"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

interface Props {
  jobId: string
  jobTitle: string
  returnUrl: string
  triggerClassName?: string
}

export function DeleteJobInlineButton({ jobId, jobTitle, returnUrl, triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      window.location.href = returnUrl
    } catch (err: any) {
      alert(err.message || "Failed to delete job.")
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"}
        aria-label="Delete job"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-base font-bold text-white mb-1">Delete job?</p>
              <p className="text-sm text-slate-400 leading-snug">
                "<span className="text-white font-medium">{jobTitle}</span>" and all its applications will be permanently removed.
              </p>
            </div>
            <div className="flex gap-2 px-4 pb-5">
              <button
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Deleting…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" />Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
