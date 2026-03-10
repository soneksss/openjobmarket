"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MessageCircle } from "lucide-react"
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

  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage("")

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSubmitMessage(t('contact.sent'))
      setName("")
      setEmail("")
      setSubject("")
      setMessage("")
    } catch (error) {
      console.error('Contact form error:', error)
      setSubmitMessage(t('contact.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <Mail className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-blue-100">
              Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                {t('contact.getInTouch')}
              </CardTitle>
              <p className="text-muted-foreground">
                {t('contact.weHereToHelp')}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('contact.name')}</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('contact.namePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('contact.email')}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contact.emailPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('contact.subject')}</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('contact.subjectPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('contact.message')}</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contact.messagePlaceholder')}
                    rows={6}
                    required
                  />
                </div>

                {submitMessage && (
                  <div className={`p-4 rounded-lg ${
                    submitMessage === t('contact.sent')
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {submitMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? t('contact.sending') : t('contact.send')}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t">
                <h3 className="font-semibold mb-4">{t('contact.faqSection')}</h3>
                <Link href={getLocalePath("/help")}>
                  <Button variant="outline" className="w-full">
                    {t('contact.viewFullFAQ')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
