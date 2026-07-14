"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import Image from "next/image"
import { helpItems } from "@/lib/data/help-items"

interface PostJobCategorySelectorProps {
  onClose: () => void
}

export function PostJobCategorySelector({ onClose }: PostJobCategorySelectorProps) {
  const router = useRouter()

  const handleSelect = (industry: string, service: string) => {
    onClose()
    router.push(`/jobs/new?industry=${encodeURIComponent(industry)}&service=${encodeURIComponent(service)}`)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">What do you need help with?</h2>
          <p className="text-xs text-slate-400 mt-0.5">Select a trade to post your job</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-3 gap-2.5 pb-20">
          {helpItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item.industry, item.service)}
              className="group relative rounded-xl overflow-hidden aspect-square bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 transition-all active:scale-95"
            >
              <Image
                src={item.img}
                alt={item.label}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 33vw, 150px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
              <span className="absolute bottom-1.5 left-0 right-0 px-1.5 text-center text-[10px] font-semibold text-white leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
