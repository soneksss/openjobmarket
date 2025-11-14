"use client"
import { useState } from "react"
import { X, HelpCircle, CreditCard } from "lucide-react"

type PaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  jobData: any
  companyProfile: any
  onPaymentComplete: (paymentData: any) => void
}

type PaymentFormData = {
  country: string
  currency: string
  hasVatId: boolean
  vatId: string
  addressLine1: string
  addressLine2: string
  zip: string
  city: string
  county: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
}

const COUNTRIES = [
  { value: "GB", label: "United Kingdom", currency: "GBP" },
  { value: "US", label: "United States", currency: "USD" },
  { value: "DE", label: "Germany", currency: "EUR" },
  { value: "FR", label: "France", currency: "EUR" },
  { value: "ES", label: "Spain", currency: "EUR" },
  { value: "IT", label: "Italy", currency: "EUR" },
  { value: "NL", label: "Netherlands", currency: "EUR" },
  { value: "CA", label: "Canada", currency: "CAD" },
  { value: "AU", label: "Australia", currency: "AUD" },
]

const CARD_TYPES = [
  { name: "Visa", logo: "💳" },
  { name: "Mastercard", logo: "💳" },
  { name: "American Express", logo: "💳" },
  { name: "Discover", logo: "💳" },
  { name: "Diners Club", logo: "💳" },
  { name: "China Union Pay", logo: "💳" },
]

export default function PaymentModal({
  isOpen,
  onClose,
  jobData,
  companyProfile,
  onPaymentComplete,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [zipSuggestions, setZipSuggestions] = useState<any[]>([])
  const [loadingZip, setLoadingZip] = useState(false)

  const [formData, setFormData] = useState<PaymentFormData>({
    country: "GB",
    currency: "GBP",
    hasVatId: false,
    vatId: "",
    addressLine1: "",
    addressLine2: "",
    zip: "",
    city: "",
    county: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
  })

  const [helpForm, setHelpForm] = useState({
    subject: "",
    message: "",
  })

  const isFreeJob = jobData.price === 0

  const handleCountryChange = (country: string) => {
    const selectedCountry = COUNTRIES.find((c) => c.value === country)
    setFormData((prev) => ({
      ...prev,
      country,
      currency: selectedCountry?.currency || "GBP",
    }))
  }

  const handleZipChange = async (zip: string) => {
    setFormData((prev) => ({ ...prev, zip }))

    if (zip.length >= 3) {
      setLoadingZip(true)
      try {
        const response = await fetch(`/api/geonames?zip=${encodeURIComponent(zip)}&country=${formData.country}`)
        const data = await response.json()
        setZipSuggestions(data.suggestions || [])
      } catch (error) {
        console.error("Failed to fetch zip suggestions:", error)
      } finally {
        setLoadingZip(false)
      }
    } else {
      setZipSuggestions([])
    }
  }

  const selectZipSuggestion = (suggestion: any) => {
    setFormData((prev) => ({
      ...prev,
      zip: suggestion.postalCode,
      city: suggestion.placeName,
      county: suggestion.adminName1,
    }))
    setZipSuggestions([])
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address Line 1 is required"
    if (!formData.zip.trim()) newErrors.zip = "ZIP code is required"
    if (!formData.city.trim()) newErrors.city = "City is required"

    if (!isFreeJob) {
      if (!formData.cardNumber.trim()) newErrors.cardNumber = "Card number is required"
      if (!formData.expiryDate.trim()) newErrors.expiryDate = "Expiry date is required"
      if (!formData.cvv.trim()) newErrors.cvv = "CVV is required"
      if (!formData.nameOnCard.trim()) newErrors.nameOnCard = "Name on card is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      if (isFreeJob) {
        // For free jobs, just pass the billing data without payment processing
        onPaymentComplete({
          ...formData,
          jobData,
          timestamp: new Date().toISOString(),
          paymentMethod: "free_plan",
          transactionId: null,
        })
      } else {
        // Simulate payment processing for paid jobs
        await new Promise((resolve) => setTimeout(resolve, 2000))

        onPaymentComplete({
          ...formData,
          jobData,
          timestamp: new Date().toISOString(),
          paymentMethod: "credit_card",
          transactionId: `txn_${Date.now()}`,
        })
      }
    } catch (error) {
      console.error("Payment failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendHelpMessage = async () => {
    try {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "djinvestltd@gmail.com",
          subject: `Payment Help: ${helpForm.subject}`,
          message: helpForm.message,
          userEmail: companyProfile.email || "unknown@example.com",
        }),
      })
      setShowHelp(false)
      setHelpForm({ subject: "", message: "" })
    } catch (error) {
      console.error("Failed to send help message:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Complete Your Job Posting</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Need help with payment details?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Job Preview Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Job Preview</h3>

              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {companyProfile.logo_url && (
                    <img
                      src={companyProfile.logo_url || "/placeholder.svg"}
                      alt="Company logo"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-bold">{jobData.title}</h1>
                    <p className="text-lg text-gray-600">{companyProfile.company_name}</p>
                    <p className="text-gray-500">{jobData.locationText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm">
                  <div>
                    <p className="text-gray-500">Salary</p>
                    <p className="font-medium">
                      £{jobData.salaryMin} - £{jobData.salaryMax} {jobData.salaryFrequency.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Job Type</p>
                    <p className="font-medium">{jobData.jobTypes.join(", ")}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Selected Plan:</strong> {jobData.recruitmentTimeline.replace("_", " ")} -
                    <span className={`ml-1 font-bold ${jobData.price === 0 ? "text-green-600" : "text-blue-600"}`}>
                      {jobData.price === 0 ? "Free" : `£${jobData.price}`}
                    </span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium">Apply now</button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium">Save</button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Prices do not include taxes, which will be additionally charged where appropriate. All fields marked
                with * are required.
              </p>

              <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                Over 500 customers successfully added a Payment method in last 24 hours
              </p>
            </div>

            {/* Payment Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{isFreeJob ? "Billing Information" : "Payment Details"}</h3>

              <div className="space-y-4">
                {/* Country and Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Currency</label>
                    <input
                      value={formData.currency}
                      readOnly
                      className="w-full border rounded-lg p-3 bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                {/* VAT ID */}
                <div>
                  <label className="block text-sm font-medium mb-2">Do you have a VAT ID?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasVatId"
                        checked={formData.hasVatId}
                        onChange={() => setFormData((prev) => ({ ...prev, hasVatId: true }))}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasVatId"
                        checked={!formData.hasVatId}
                        onChange={() => setFormData((prev) => ({ ...prev, hasVatId: false, vatId: "" }))}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {formData.hasVatId && (
                    <input
                      type="text"
                      value={formData.vatId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vatId: e.target.value }))}
                      placeholder="Enter VAT ID"
                      className="w-full border rounded-lg p-3 mt-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                {/* Billing Address */}
                <div className="space-y-4">
                  <h4 className="font-medium">Billing Address</h4>

                  <div>
                    <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                      className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.addressLine1 ? "border-red-500" : ""}`}
                      placeholder="Street address"
                    />
                    {errors.addressLine1 && <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                      className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">ZIP *</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => handleZipChange(e.target.value)}
                      className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.zip ? "border-red-500" : ""}`}
                      placeholder="Postal code"
                    />
                    {errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}

                    {zipSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {zipSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => selectZipSuggestion(suggestion)}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <div className="font-medium">{suggestion.postalCode}</div>
                            <div className="text-sm text-gray-600">
                              {suggestion.placeName}, {suggestion.adminName1}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {loadingZip && <p className="text-sm text-gray-500 mt-1">Loading suggestions...</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? "border-red-500" : ""}`}
                        placeholder="City"
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">County</label>
                      <input
                        type="text"
                        value={formData.county}
                        onChange={(e) => setFormData((prev) => ({ ...prev, county: e.target.value }))}
                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="County (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Payment Section - Only show for paid jobs */}
                {!isFreeJob && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <h4 className="font-medium">Card Payment</h4>
                    </div>

                    <div className="flex gap-2 mb-4">
                      {CARD_TYPES.map((card) => (
                        <div key={card.name} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                          <span>{card.logo}</span>
                          <span>{card.name}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Card Number *</label>
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                        className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.cardNumber ? "border-red-500" : ""}`}
                        placeholder="1234 5678 9012 3456"
                      />
                      {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Expiry Date *</label>
                        <input
                          type="text"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                          className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.expiryDate ? "border-red-500" : ""}`}
                          placeholder="MM/YY"
                        />
                        {errors.expiryDate && <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Security Code *</label>
                        <input
                          type="text"
                          value={formData.cvv}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cvv: e.target.value }))}
                          className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.cvv ? "border-red-500" : ""}`}
                          placeholder="CVV"
                        />
                        {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Name on Card *</label>
                      <input
                        type="text"
                        value={formData.nameOnCard}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nameOnCard: e.target.value }))}
                        className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.nameOnCard ? "border-red-500" : ""}`}
                        placeholder="Full name as on card"
                      />
                      {errors.nameOnCard && <p className="text-red-500 text-sm mt-1">{errors.nameOnCard}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="text-xs text-gray-500 mb-4">
            By clicking 'Submit', you agree to Openjobmarket's Terms of Service, Cookie Policy and Privacy Policy, and
            agree to payment as described under Openjobmarket's Resume Terms. Transactions will be processed for the
            Openjobmarket entity located in the following country: UK.
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : isFreeJob ? "Publish Job" : "Submit Payment"}
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Need help with payment details?</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={helpForm.subject}
                  onChange={(e) => setHelpForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={helpForm.message}
                  onChange={(e) => setHelpForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe your issue..."
                />
              </div>

              <button
                onClick={sendHelpMessage}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
