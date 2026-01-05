"use client"

import { useState, useEffect } from "react"
import { X, ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type RoleType = 'homeowner' | 'employed' | 'unemployed' | 'selfEmployed' | 'companyOwner' | 'agency' | 'browsing'

interface QuickCheckModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickCheckModal({ isOpen, onClose }: QuickCheckModalProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)

  // Reset to role selection when modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(null)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const roles: RoleType[] = ['homeowner', 'employed', 'unemployed', 'selfEmployed', 'companyOwner', 'agency', 'browsing']

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role)
  }

  const handleBack = () => {
    setSelectedRole(null)
  }

  const handleCreateAccount = () => {
    onClose()
    router.push('/auth/sign-up')
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-blue-100">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {selectedRole && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {t('quickCheck.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {!selectedRole ? (
            // Role Selection View
            <div>
              <p className="text-gray-700 text-lg mb-8 text-center font-medium">
                {t('quickCheck.selectRole')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className="group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-left overflow-hidden transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-colors duration-300">
                        <span className="text-3xl">{t(`quickCheck.roles.${role}.icon`)}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {t(`quickCheck.roles.${role}.title`)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Role Benefits View
            <div className="space-y-6">
              {/* Icon and Headline */}
              <div className="text-center">
                <div className="inline-block p-5 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                  <span className="text-6xl">
                    {t(`quickCheck.roles.${selectedRole}.icon`)}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t(`quickCheck.roles.${selectedRole}.headline`)}
                </h3>
              </div>

              {/* Description and Subtext - 2 columns on desktop */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-lg">
                  <p className="text-gray-800 leading-relaxed font-medium">
                    {t(`quickCheck.roles.${selectedRole}.description`)}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                  <p className="text-gray-700 leading-relaxed">
                    {t(`quickCheck.roles.${selectedRole}.subtext`)}
                  </p>
                </div>
              </div>

              {/* Benefits List - 2 columns on desktop */}
              <div className="bg-white rounded-xl p-5 shadow-lg border-2 border-purple-200">
                <h4 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  Key Benefits:
                </h4>
                <ul className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                  {t(`quickCheck.roles.${selectedRole}.benefits`).map((benefit: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 group">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <span className="text-gray-800 text-sm leading-relaxed group-hover:text-blue-600 transition-colors duration-200">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div>
                <Button
                  onClick={handleCreateAccount}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  {t('quickCheck.createAccount')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
