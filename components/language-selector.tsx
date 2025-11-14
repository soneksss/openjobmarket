"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"

// Common languages with their flag emojis
const COMMON_LANGUAGES = [
  { name: "English", flag: "🇬🇧" },
  { name: "Spanish", flag: "🇪🇸" },
  { name: "Mandarin", flag: "🇨🇳" },
  { name: "Hindi", flag: "🇮🇳" },
  { name: "French", flag: "🇫🇷" },
  { name: "Arabic", flag: "🇸🇦" },
  { name: "Portuguese", flag: "🇵🇹" },
  { name: "Russian", flag: "🇷🇺" },
  { name: "German", flag: "🇩🇪" },
  { name: "Japanese", flag: "🇯🇵" },
  { name: "Italian", flag: "🇮🇹" },
  { name: "Korean", flag: "🇰🇷" },
  { name: "Turkish", flag: "🇹🇷" },
  { name: "Polish", flag: "🇵🇱" },
  { name: "Dutch", flag: "🇳🇱" },
  { name: "Swedish", flag: "🇸🇪" },
  { name: "Greek", flag: "🇬🇷" },
  { name: "Czech", flag: "🇨🇿" },
  { name: "Romanian", flag: "🇷🇴" },
  { name: "Ukrainian", flag: "🇺🇦" },
  { name: "Vietnamese", flag: "🇻🇳" },
  { name: "Thai", flag: "🇹🇭" },
  { name: "Indonesian", flag: "🇮🇩" },
  { name: "Hungarian", flag: "🇭🇺" },
  { name: "Norwegian", flag: "🇳🇴" },
  { name: "Danish", flag: "🇩🇰" },
  { name: "Finnish", flag: "🇫🇮" },
  { name: "Bulgarian", flag: "🇧🇬" },
  { name: "Croatian", flag: "🇭🇷" },
  { name: "Slovak", flag: "🇸🇰" },
]

// Helper function to get flag for a language
export function getLanguageFlag(language: string): string {
  const lang = COMMON_LANGUAGES.find(
    (l) => l.name.toLowerCase() === language.toLowerCase()
  )
  return lang?.flag || "🗣️"
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

  const handleLanguageToggle = (languageName: string) => {
    if (selectedLanguages.includes(languageName)) {
      onChange(selectedLanguages.filter((l) => l !== languageName))
    } else {
      onChange([...selectedLanguages, languageName])
    }
  }

  const handleManualAdd = () => {
    const trimmed = manualInput.trim()
    if (trimmed && !selectedLanguages.includes(trimmed)) {
      onChange([...selectedLanguages, trimmed])
      setManualInput("")
      setShowManualInput(false)
    }
  }

  const handleRemoveLanguage = (language: string) => {
    onChange(selectedLanguages.filter((l) => l !== language))
  }

  return (
    <div className={className}>
      {/* Selected Languages */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedLanguages.map((lang) => (
            <Badge
              key={lang}
              variant="secondary"
              className="text-sm px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              <span className="mr-1">{getLanguageFlag(lang)}</span>
              {lang}
              <button
                type="button"
                onClick={() => handleRemoveLanguage(lang)}
                className="ml-2 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Common Languages - Small Flag Icons */}
      <div className="flex flex-wrap gap-1.5 mb-3 p-3 border rounded-lg bg-gray-50">
        {COMMON_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang.name)
          return (
            <button
              key={lang.name}
              type="button"
              onClick={() => handleLanguageToggle(lang.name)}
              className={`
                text-lg hover:scale-110 transition-transform rounded
                ${
                  isSelected
                    ? "ring-2 ring-blue-500 ring-offset-1 opacity-100"
                    : "opacity-60 hover:opacity-100"
                }
              `}
              title={lang.name}
            >
              {lang.flag}
            </button>
          )
        })}
      </div>

      {/* Manual Input */}
      {showManualInput ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleManualAdd()
              }
            }}
            placeholder="Enter language name"
            className="flex-1"
          />
          <Button type="button" onClick={handleManualAdd} size="sm">
            Add
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowManualInput(false)
              setManualInput("")
            }}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setShowManualInput(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Other Language
        </Button>
      )}
    </div>
  )
}
