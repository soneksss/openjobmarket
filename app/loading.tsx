export default function Loading() {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}
