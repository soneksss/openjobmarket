"use client"
import { useState } from "react"
import { X, HelpCircle, CreditCard, Users, Star } from "lucide-react"

type ProfessionalPaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  featureName: string
  price: number
  description: string
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

export default function ProfessionalPaymentModal({
  isOpen,
  onClose,
  featureName,
  price,
  description,
  onPaymentComplete,
}: ProfessionalPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
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

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const selectedCountry = COUNTRIES.find((c) => c.value === formData.country)
  const currencySymbol = selectedCountry?.currency === "USD" ? "$" : selectedCountry?.currency === "EUR" ? "€" : "£"

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.addressLine1.trim()) {
        newErrors.addressLine1 = "Address is required"
      }
      if (!formData.city.trim()) {
        newErrors.city = "City is required"
      }
      if (!formData.zip.trim()) {
        newErrors.zip = "Postal code is required"
      }
      if (formData.hasVatId && !formData.vatId.trim()) {
        newErrors.vatId = "VAT ID is required when selected"
      }
    }

    if (step === 2) {
      if (!formData.nameOnCard.trim()) {
        newErrors.nameOnCard = "Name on card is required"
      }
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = "Card number is required"
      }
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = "Expiry date is required"
      }
      if (!formData.cvv.trim()) {
        newErrors.cvv = "CVV is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return

    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock payment data
      const paymentData = {
        paymentMethod: "credit_card",
        timestamp: new Date().toISOString(),
        transactionId: `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: price,
        currency: formData.currency,
        feature: featureName,
        billingAddress: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          postal_code: formData.zip,
          country: formData.country,
        },
        card: {
          last4: formData.cardNumber.slice(-4),
          brand: "visa", // Mock brand
        },
      }

      onPaymentComplete(paymentData)
    } catch (error) {
      console.error("Payment failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const updateFormData = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upgrade Professional Profile</h2>
              <p className="text-sm text-gray-600">Unlock premium features to boost your visibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Feature Summary */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-gray-900">{featureName}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {currencySymbol}{price}
              </div>
              <div className="text-sm text-gray-500">One-time payment</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>

              {/* Country Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => {
                    const country = COUNTRIES.find((c) => c.value === e.target.value)
                    updateFormData("country", e.target.value)
                    if (country) {
                      updateFormData("currency", country.currency)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1*</label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => updateFormData("addressLine1", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.addressLine1 ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="123 Main Street"
                  />
                  {errors.addressLine1 && <p className="text-sm text-red-600 mt-1">{errors.addressLine1}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => updateFormData("addressLine2", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City*</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.city ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="London"
                  />
                  {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code*</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => updateFormData("zip", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.zip ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="SW1A 1AA"
                  />
                  {errors.zip && <p className="text-sm text-red-600 mt-1">{errors.zip}</p>}
                </div>
              </div>

              {/* VAT ID */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasVatId"
                    checked={formData.hasVatId}
                    onChange={(e) => updateFormData("hasVatId", e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasVatId" className="ml-2 block text-sm text-gray-700">
                    I have a VAT ID
                  </label>
                </div>

                {formData.hasVatId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">VAT ID*</label>
                    <input
                      type="text"
                      value={formData.vatId}
                      onChange={(e) => updateFormData("vatId", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.vatId ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="GB123456789"
                    />
                    {errors.vatId && <p className="text-sm text-red-600 mt-1">{errors.vatId}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>

              {/* Accepted Cards */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Accepted Cards</p>
                <div className="flex space-x-2">
                  {CARD_TYPES.map((card) => (
                    <div key={card.name} className="flex items-center space-x-1 text-xs text-gray-600">
                      <span>{card.logo}</span>
                      <span>{card.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card*</label>
                  <input
                    type="text"
                    value={formData.nameOnCard}
                    onChange={(e) => updateFormData("nameOnCard", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.nameOnCard ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.nameOnCard && <p className="text-sm text-red-600 mt-1">{errors.nameOnCard}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Number*</label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => updateFormData("cardNumber", e.target.value.replace(/\s/g, ""))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.cardNumber ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="1234 5678 9012 3456"
                  />
                  {errors.cardNumber && <p className="text-sm text-red-600 mt-1">{errors.cardNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date*</label>
                    <input
                      type="text"
                      value={formData.expiryDate}
                      onChange={(e) => updateFormData("expiryDate", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.expiryDate ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="MM/YY"
                    />
                    {errors.expiryDate && <p className="text-sm text-red-600 mt-1">{errors.expiryDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV*
                      <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400" />
                    </label>
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => updateFormData("cvv", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.cvv ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="123"
                    />
                    {errors.cvv && <p className="text-sm text-red-600 mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{currencySymbol}{price}</span>
          </div>

          <div className="flex space-x-3">
            {currentStep === 2 && (
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}

            {currentStep === 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>{isProcessing ? "Processing..." : `Pay ${currencySymbol}${price}`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}