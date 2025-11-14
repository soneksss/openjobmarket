"use client"

import { useState } from "react"
import { X, DollarSign, MessageCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/client"

type EnquiryPaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  professionalName: string
  professionalId: string
  companyUserId: string
  enquiryFee: number
  onPaymentComplete: () => void
}

export default function EnquiryPaymentModal({
  isOpen,
  onClose,
  professionalName,
  professionalId,
  companyUserId,
  enquiryFee,
  onPaymentComplete,
}: EnquiryPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleFreePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check subscription limits before proceeding
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Authentication required.")
        setLoading(false)
        return
      }

      const { data: canContact, error: checkError } = await supabase
        .rpc("can_user_contact_professional", { user_id_param: user.id })

      if (checkError) {
        console.error("Error checking contact permission:", checkError)
        setError("Failed to verify contact permissions.")
        setLoading(false)
        return
      }

      if (!canContact.can_contact) {
        if (canContact.reason === 'no_subscription') {
          setError("You need an active subscription to contact professionals. Please visit the Subscription page to purchase a plan.")
          setLoading(false)
          return
        } else if (canContact.reason === 'contact_limit_exceeded') {
          setError(`You have reached your professional contact limit (${canContact.contacts_used}/${canContact.contacts_limit}). Please upgrade your subscription or wait for your current plan to renew.`)
          setLoading(false)
          return
        } else {
          setError("You are not authorized to contact professionals at this time.")
          setLoading(false)
          return
        }
      }

      // Process free enquiry (for when admin sets fee to 0)
      const { data: paymentId, error: paymentError } = await supabase.rpc(
        "process_enquiry_payment",
        {
          company_id: companyUserId,
          professional_id: professionalId,
          payment_amount: 0,
          payment_method: "free",
          transaction_id: null,
          payment_data: {
            type: "free_enquiry",
            timestamp: new Date().toISOString(),
          },
        }
      )

      if (paymentError) {
        console.error("Error processing free payment:", paymentError)
        setError("Failed to process payment. Please try again.")
        return
      }

      // Increment contact usage counter if subscriptions are enabled
      await supabase.rpc("increment_subscription_usage", {
        user_id_param: user.id,
        usage_type: "contact"
      })

      onPaymentComplete()
    } catch (err) {
      console.error("Exception processing payment:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePaidPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check subscription limits before proceeding
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Authentication required.")
        setLoading(false)
        return
      }

      const { data: canContact, error: checkError } = await supabase
        .rpc("can_user_contact_professional", { user_id_param: user.id })

      if (checkError) {
        console.error("Error checking contact permission:", checkError)
        setError("Failed to verify contact permissions.")
        setLoading(false)
        return
      }

      if (!canContact.can_contact) {
        if (canContact.reason === 'no_subscription') {
          setError("You need an active subscription to contact professionals. Please visit the Subscription page to purchase a plan.")
          setLoading(false)
          return
        } else if (canContact.reason === 'contact_limit_exceeded') {
          setError(`You have reached your professional contact limit (${canContact.contacts_used}/${canContact.contacts_limit}). Please upgrade your subscription or wait for your current plan to renew.`)
          setLoading(false)
          return
        } else {
          setError("You are not authorized to contact professionals at this time.")
          setLoading(false)
          return
        }
      }

      // For now, simulate payment processing
      // In a real implementation, this would integrate with Stripe, PayPal, etc.
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const { data: paymentId, error: paymentError } = await supabase.rpc(
        "process_enquiry_payment",
        {
          company_id: companyUserId,
          professional_id: professionalId,
          payment_amount: enquiryFee,
          payment_method: "simulated_payment",
          transaction_id: `txn_${Date.now()}`,
          payment_data: {
            type: "paid_enquiry",
            amount: enquiryFee,
            currency: "GBP",
            timestamp: new Date().toISOString(),
            payment_gateway: "simulated",
          },
        }
      )

      if (paymentError) {
        console.error("Error processing payment:", paymentError)
        setError("Failed to process payment. Please try again.")
        return
      }

      // Increment contact usage counter if subscriptions are enabled
      await supabase.rpc("increment_subscription_usage", {
        user_id_param: user.id,
        usage_type: "contact"
      })

      onPaymentComplete()
    } catch (err) {
      console.error("Exception processing payment:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isFree = enquiryFee === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <span>Contact Professional</span>
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Contact {professionalName}</h3>
            <p className="text-sm text-muted-foreground">
              {isFree
                ? "You can contact this professional for free!"
                : `There is a £${enquiryFee} fee to contact this professional`}
            </p>
          </div>

          {!isFree && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Enquiry Fee</p>
                    <p className="text-sm text-blue-600">
                      This fee helps maintain platform quality and ensures serious inquiries
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Contact Fee:</span>
                    <span className="text-xl font-bold text-blue-600">£{enquiryFee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              After {isFree ? "confirming" : "payment"}, you'll be able to send a direct message to {professionalName}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            {isFree ? (
              <Button
                onClick={handleFreePayment}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Processing..." : "Send Message"}
              </Button>
            ) : (
              <Button
                onClick={handlePaidPayment}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : `Pay £${enquiryFee} & Contact`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}