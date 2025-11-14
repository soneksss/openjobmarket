"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, MessageCircle, X, Bug, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

export default function ContactPage() {
  const [showFAQ, setShowFAQ] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugDescription, setBugDescription] = useState("")
  const [bugEmail, setBugEmail] = useState("")
  const [bugName, setBugName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const router = useRouter()

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How do I create an account?",
          a: "Click 'Sign Up' in the header, choose whether you're a job seeker or employer, and fill in your details. You'll receive a verification email to activate your account."
        },
        {
          q: "Is Open Job Market free to use?",
          a: "Yes! Searching for jobs and browsing talent is completely free. Employers can post jobs and message candidates with our subscription plans."
        },
        {
          q: "Can I use the platform anonymously?",
          a: "Absolutely! You can browse jobs and search for opportunities without revealing your identity. Your current employer won't know you're looking."
        }
      ]
    },
    {
      category: "For Job Seekers",
      questions: [
        {
          q: "How do I search for jobs?",
          a: "Use the search bar on the homepage to enter your desired job title, skill, or trade. Click one of the four search buttons (Vacancies, Jobs/Tasks, Tradespeople, Talent) to see results on an interactive map."
        },
        {
          q: "How do employers find me?",
          a: "Complete your profile with your skills, experience, and location. Enable 'Let employers find me' in your profile settings so recruiters can contact you directly."
        },
        {
          q: "Can I apply to jobs without a full profile?",
          a: "Yes, but a complete profile significantly increases your chances. Employers prefer candidates with detailed information, photos, and CVs."
        }
      ]
    },
    {
      category: "For Employers",
      questions: [
        {
          q: "How do I post a job?",
          a: "After signing up as a company, go to your dashboard and click 'Post Job'. Fill in the job details, location, salary, and requirements, then publish."
        },
        {
          q: "How do I find candidates?",
          a: "Use the talent search feature to filter candidates by location, skills, experience, and availability. You can message them directly through the platform."
        },
        {
          q: "What subscription plans are available?",
          a: "We offer Basic, Professional, and Enterprise plans with varying features like job posts, candidate searches, and priority support. Visit your dashboard to view pricing."
        }
      ]
    },
    {
      category: "For Tradespeople & Homeowners",
      questions: [
        {
          q: "How do tradespeople get hired?",
          a: "Create a profile showcasing your trade, services, certifications, and past work. Homeowners and businesses can find you through search or you can apply to posted jobs."
        },
        {
          q: "How do homeowners hire tradespeople?",
          a: "Post a job describing your project, or search for tradespeople in your area. Review profiles, check ratings, compare quotes, and hire directly."
        },
        {
          q: "Are tradespeople verified?",
          a: "Tradespeople can upload certifications, insurance documents, and professional registrations. Always check profiles for verified credentials before hiring."
        }
      ]
    },
    {
      category: "Account & Privacy",
      questions: [
        {
          q: "How do I delete my account?",
          a: "Go to Account Settings > Privacy > Delete Account. Note that this action is permanent and cannot be undone."
        },
        {
          q: "How is my data protected?",
          a: "We use industry-standard encryption and security measures. Your personal data is never sold to third parties. Read our Privacy Policy for full details."
        },
        {
          q: "Can I hide my profile from specific companies?",
          a: "Yes! In your privacy settings, you can block specific companies from viewing your profile or contacting you."
        }
      ]
    },
    {
      category: "Payments & Billing",
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards (Visa, Mastercard, Amex), debit cards, and PayPal through our secure payment processor Stripe."
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes, you can cancel anytime from your subscription settings. You'll retain access until the end of your billing period."
        },
        {
          q: "Do you offer refunds?",
          a: "We offer a 14-day money-back guarantee for new subscriptions. Contact support if you're not satisfied with our service."
        }
      ]
    }
  ]

  const handleBugSubmit = async () => {
    if (!bugDescription.trim()) {
      setSubmitMessage("Please describe the bug")
      return
    }

    setIsSubmitting(true)
    setSubmitMessage("")

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Insert bug report into a messages or support table
      // You'll need to create a bug_reports or support_tickets table
      const { error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user?.id || null,
          name: bugName || 'Anonymous',
          email: bugEmail || user?.email || 'No email provided',
          description: bugDescription,
          status: 'open',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error submitting bug report:', error)
        setSubmitMessage("Failed to submit bug report. Please try again.")
      } else {
        setSubmitMessage("Bug report submitted successfully! We'll investigate this issue.")
        setBugDescription("")
        setBugEmail("")
        setBugName("")
        setTimeout(() => {
          setShowBugReport(false)
          setSubmitMessage("")
        }, 2000)
      }
    } catch (error) {
      console.error('Error:', error)
      setSubmitMessage("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Get in Touch</CardTitle>
            <p className="text-muted-foreground">
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <Input placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <Input placeholder="Doe" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" placeholder="john@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea placeholder="Tell us how we can help you..." className="min-h-[120px]" />
              </div>

              <Button className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">info@openjobmarket.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Support Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="text-muted-foreground">9:00 AM - 6:00 PM GMT</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="text-muted-foreground">10:00 AM - 4:00 PM GMT</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-muted-foreground">Closed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-0 h-auto text-blue-600 hover:text-blue-700"
                  onClick={() => setShowFAQ(true)}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center & FAQ
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-0 h-auto text-blue-600 hover:text-blue-700"
                  onClick={() => setShowBugReport(true)}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report a Bug
                </Button>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto text-gray-400" disabled>
                  Feature Requests (Coming soon)
                </Button>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto text-gray-400" disabled>
                  API Documentation (Coming soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Modal */}
      {showFAQ && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-lg shadow-2xl">
            <button
              onClick={() => setShowFAQ(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="overflow-y-auto max-h-[85vh] p-8">
              <div className="flex items-center mb-6">
                <HelpCircle className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-3xl font-bold text-blue-600">Help Center & FAQ</h2>
              </div>
              <p className="text-gray-600 mb-8">Find answers to common questions about using Open Job Market</p>

              <div className="space-y-6">
                {faqs.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border-b pb-6 last:border-b-0">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                      {category.category}
                    </h3>
                    <div className="space-y-3 ml-5">
                      {category.questions.map((faq, faqIndex) => {
                        const uniqueIndex = categoryIndex * 100 + faqIndex
                        return (
                          <div key={faqIndex} className="border rounded-lg">
                            <button
                              onClick={() => setExpandedFAQ(expandedFAQ === uniqueIndex ? null : uniqueIndex)}
                              className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="font-medium text-gray-800">{faq.q}</span>
                              {expandedFAQ === uniqueIndex ? (
                                <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                              )}
                            </button>
                            {expandedFAQ === uniqueIndex && (
                              <div className="px-4 pb-4 text-gray-700 leading-relaxed">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-gray-800 mb-2">Still have questions?</h4>
                <p className="text-gray-700 mb-3">Can't find the answer you're looking for? Our support team is here to help.</p>
                <Button onClick={() => setShowFAQ(false)} className="bg-blue-600 hover:bg-blue-700">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl overflow-hidden bg-white rounded-lg shadow-2xl">
            <button
              onClick={() => {
                setShowBugReport(false)
                setSubmitMessage("")
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="p-8">
              <div className="flex items-center mb-4">
                <Bug className="h-8 w-8 text-red-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-800">Report a Bug</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Help us improve by reporting any bugs or issues you encounter. Our team will investigate and resolve it as soon as possible.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name (Optional)</label>
                  <Input
                    placeholder="John Doe"
                    value={bugName}
                    onChange={(e) => setBugName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Your Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={bugEmail}
                    onChange={(e) => setBugEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll use this to follow up on the bug report</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bug Description *</label>
                  <Textarea
                    placeholder="Please describe the bug in detail. Include what you were doing when it occurred, what you expected to happen, and what actually happened..."
                    className="min-h-[150px]"
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                  />
                </div>

                {submitMessage && (
                  <div className={`p-3 rounded-lg ${submitMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {submitMessage}
                  </div>
                )}

                <Button
                  onClick={handleBugSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Bug className="h-4 w-4 mr-2" />
                      Submit Bug Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
