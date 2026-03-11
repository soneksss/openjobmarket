"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import Link from "next/link"

export default function ContactPage() {
  const { t, locale } = useTranslation()
  const isOnBrRoute = locale === 'pt-BR'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage("")
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')
      setSubmitMessage(t('contact.sent'))
      setName(""); setEmail(""); setSubject(""); setMessage("")
    } catch {
      setSubmitMessage(t('contact.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const success = submitMessage === t('contact.sent')

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Get in Touch</h1>
          <p className="text-slate-300">Send us a message and we'll get back to you as soon as possible.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">{t('contact.getInTouch')}</h2>
          <p className="text-sm text-slate-400 mb-6">{t('contact.weHereToHelp')}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('contact.name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('contact.namePlaceholder')}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('contact.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder')}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('contact.subject')}</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('contact.subjectPlaceholder')}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('contact.message')}</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder')}
                rows={5}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            {submitMessage && (
              <div className={`p-4 rounded-lg text-sm ${
                success
                  ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50'
                  : 'bg-red-900/30 text-red-300 border border-red-700/50'
              }`}>
                {submitMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isSubmitting ? t('contact.sending') : t('contact.send')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">{t('contact.faqSection')}</h3>
            <Link
              href={getLocalePath("/help")}
              className="block w-full text-center text-sm border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white py-2.5 rounded-xl transition-colors"
            >
              {t('contact.viewFullFAQ')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
