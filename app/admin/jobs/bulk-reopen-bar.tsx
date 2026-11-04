"use client"

import { useEffect, useState, useTransition } from "react"

// The ticked rows on the jobs list are checkboxes with form="bulk-reopen",
// so they belong to this form even though they sit inside the table.
const BOXES = 'input[form="bulk-reopen"][name="ids"]'

export function BulkReopenBar({ action }: { action: (fd: FormData) => Promise<{ reopened: number; failed: number }> }) {
  const [selected, setSelected] = useState(0)
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(BOXES))
  const recount = () => {
    const all = boxes()
    setTotal(all.length)
    setSelected(all.filter(b => b.checked).length)
  }

  useEffect(() => {
    recount()
    const onChange = (e: Event) => { if ((e.target as Element).matches?.(BOXES)) recount() }
    document.addEventListener("change", onChange)
    // Rows change after a reopen (the server re-renders the table), so recount then too.
    const observer = new MutationObserver(recount)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener("change", onChange)
      observer.disconnect()
    }
  }, [])

  const setAll = (checked: boolean) => {
    boxes().forEach(b => { b.checked = checked })
    recount()
  }

  return (
    <form
      id="bulk-reopen"
      action={fd => startTransition(async () => {
        setResult(null)
        const { reopened, failed } = await action(fd)
        setAll(false)
        setResult(`Reopened ${reopened} job${reopened === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`)
      })}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 px-3 py-2 text-xs"
    >
      <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={total > 0 && selected === total} disabled={total === 0}
          onChange={e => setAll(e.target.checked)} className="accent-emerald-500" />
        Select all closed ({total})
      </label>
      <button type="submit" disabled={selected === 0 || pending}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed">
        {pending ? "Reopening…" : `Reopen selected (${selected})`}
      </button>
      {result && <span className="text-zinc-400">{result}</span>}
    </form>
  )
}
