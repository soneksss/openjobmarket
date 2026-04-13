"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"

// cc = ISO 3166-1 alpha-2 country code used by flagcdn.com
const COMMON_LANGUAGES = [
  { name: "English",              cc: "gb" },
  { name: "Polish",               cc: "pl" },
  { name: "Romanian",             cc: "ro" },
  { name: "Ukrainian",            cc: "ua" },
  { name: "Bulgarian",            cc: "bg" },
  { name: "Slovak",               cc: "sk" },
  { name: "Czech",                cc: "cz" },
  { name: "Hungarian",            cc: "hu" },
  { name: "Croatian",             cc: "hr" },
  { name: "Russian",              cc: "ru" },
  { name: "French",               cc: "fr" },
  { name: "German",               cc: "de" },
  { name: "Spanish",              cc: "es" },
  { name: "Italian",              cc: "it" },
  { name: "Portuguese",           cc: "pt" },
  { name: "Brazilian Portuguese", cc: "br" },
  { name: "Dutch",                cc: "nl" },
  { name: "Swedish",              cc: "se" },
  { name: "Norwegian",            cc: "no" },
  { name: "Danish",               cc: "dk" },
  { name: "Finnish",              cc: "fi" },
  { name: "Greek",                cc: "gr" },
  { name: "Turkish",              cc: "tr" },
  { name: "Arabic",               cc: "sa" },
  { name: "Hindi",                cc: "in" },
  { name: "Mandarin",             cc: "cn" },
  { name: "Japanese",             cc: "jp" },
  { name: "Korean",               cc: "kr" },
  { name: "Vietnamese",           cc: "vn" },
  { name: "Thai",                 cc: "th" },
  { name: "Indonesian",           cc: "id" },
]

function flagUrl(cc: string) {
  return `https://flagcdn.com/w40/${cc}.png`
}

export function getLanguageFlag(language: string): string | null {
  const lang = COMMON_LANGUAGES.find(
    (l) => l.name.toLowerCase() === language.toLowerCase()
  )
  return lang ? flagUrl(lang.cc) : null
}

function FlagImg({ cc, name }: { cc: string; name: string }) {
  return (
    <img
      src={flagUrl(cc)}
      alt={name}
      width={20}
      height={15}
      className="rounded-sm object-cover flex-shrink-0"
      loading="lazy"
    />
  )
}

interface LanguageSelectorProps {
  selectedLanguages: string[]
  onChange: (languages: string[]) => void
  className?: string
}

export default function LanguageSelector({
  selectedLanguages,
  onChange,
  className = "",
}: LanguageSelectorProps) {
  const [manualInput, setManualInput] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)

  const toggle = (name: string) => {
    onChange(
      selectedLanguages.includes(name)
        ? selectedLanguages.filter((l) => l !== name)
        : [...selectedLanguages, name]
    )
  }

  const handleManualAdd = () => {
    const trimmed = manualInput.trim()
    if (trimmed && !selectedLanguages.includes(trimmed)) {
      onChange([...selectedLanguages, trimmed])
      setManualInput("")
      setShowManualInput(false)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Flag grid */}
      <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-3">
        <div className="flex flex-wrap gap-2">
          {COMMON_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.name)
            return (
              <button
                key={lang.name}
                type="button"
                onClick={() => toggle(lang.name)}
                title={lang.name}
                className={`
                  relative flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-all select-none
                  ${isSelected
                    ? "bg-emerald-500/20 ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-800"
                    : "bg-slate-700/50 hover:bg-slate-700 ring-1 ring-slate-600"
                  }
                `}
              >
                <FlagImg cc={lang.cc} name={lang.name} />
                <span className={`text-[9px] font-medium leading-none max-w-[44px] text-center truncate ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                  {lang.name}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected chips */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLanguages.map((lang) => {
            const found = COMMON_LANGUAGES.find(l => l.name === lang)
            return (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-300"
              >
                {found
                  ? <img src={flagUrl(found.cc)} alt={lang} width={16} height={12} className="rounded-sm object-cover flex-shrink-0" />
                  : <span className="text-sm">🗣️</span>
                }
                {lang}
                <button
                  type="button"
                  onClick={() => onChange(selectedLanguages.filter((l) => l !== lang))}
                  className="ml-0.5 text-emerald-400/60 hover:text-emerald-300 transition-colors"
                  aria-label={`Remove ${lang}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Add unlisted language */}
      {showManualInput ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleManualAdd() }
              if (e.key === "Escape") { setShowManualInput(false); setManualInput("") }
            }}
            placeholder="Language name…"
            autoFocus
            className="flex-1 h-8 text-sm bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={handleManualAdd}
            className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowManualInput(false); setManualInput("") }}
            className="h-8 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors py-0.5"
        >
          <Plus className="w-4 h-4" />
          Add unlisted language
        </button>
      )}
    </div>
  )
}
