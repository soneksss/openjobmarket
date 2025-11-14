"use client"
import { useState } from "react"
import { Check, ArrowRight, Calendar, Clock, Users, Zap } from "lucide-react"

const RECRUITMENT_TIMELINE_OPTIONS = [
  {
    value: "3_days",
    label: "3 days",
    price: 0,
    displayPrice: "Free",
    description: "Perfect for urgent hiring needs",
    features: ["Immediate posting", "3 days visibility", "Basic analytics", "Candidate applications"],
  },
  {
    value: "7_days",
    label: "7 days",
    price: 10,
    displayPrice: "£10",
    description: "Most popular option",
    features: ["Extended visibility", "Priority placement", "Advanced analytics", "Email notifications"],
  },
  {
    value: "2_weeks",
    label: "2 weeks",
    price: 15,
    displayPrice: "£15",
    description: "Great for specialized roles",
    features: ["14 days visibility", "Featured listing", "Candidate filtering", "Performance insights"],
  },
  {
    value: "3_weeks",
    label: "3 weeks",
    price: 20,
    displayPrice: "£20",
    description: "Comprehensive hiring campaign",
    features: ["21 days visibility", "Top placement", "Advanced filtering", "Detailed reports"],
  },
  {
    value: "4_weeks",
    label: "4 weeks",
    price: 25,
    displayPrice: "£25",
    description: "Maximum exposure",
    features: ["28 days visibility", "Premium placement", "All features", "Priority support"],
  },
]

export default function FreePlanDemoPage() {
  const [selectedPlan, setSelectedPlan] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const handlePlanSelect = (planValue: string) => {
    setSelectedPlan(planValue)
  }

  const handleSubmit = () => {
    if (selectedPlan === "3_days") {
      setShowSuccess(true)
    } else {
      alert("This demo focuses on the free plan. In the real app, paid plans would redirect to payment processing.")
    }
  }

  const selectedPlanData = RECRUITMENT_TIMELINE_OPTIONS.find((option) => option.value === selectedPlan)

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 Job Posted Successfully!</h1>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-green-900 mb-4">Free Plan Confirmation</h2>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      <strong>Duration:</strong> 3 days
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      <strong>Status:</strong> Live immediately
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      <strong>Expires:</strong> {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      <strong>Cost:</strong> £0.00
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <p className="text-blue-800">Your job is now visible to candidates</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <p className="text-blue-800">You'll receive applications via email</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <p className="text-blue-800">Extend anytime before expiry</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setShowSuccess(false)
                  setSelectedPlan("")
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Post Another Job
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                View Dashboard
              </button>
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Free Plan Job Posting Demo</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience our free 3-day job posting option. No payment required, no hidden fees - just post your job and
            start receiving applications immediately.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Plan Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Choose Your Job Posting Plan</h2>

              <div className="space-y-4">
                {RECRUITMENT_TIMELINE_OPTIONS.map((option, index) => (
                  <label
                    key={option.value}
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-300 ${
                      selectedPlan === option.value
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <input
                          type="radio"
                          name="recruitmentTimeline"
                          value={option.value}
                          checked={selectedPlan === option.value}
                          onChange={(e) => handlePlanSelect(e.target.value)}
                          className="w-5 h-5 text-blue-600 mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl font-bold">{option.label}</span>
                            {option.value === "3_days" && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                🆓 FREE
                              </span>
                            )}
                            {option.value === "7_days" && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                🔥 POPULAR
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">{option.description}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {option.features.map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                <Check className="w-4 h-4 text-green-500" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-3xl font-bold ${option.price === 0 ? "text-green-600" : "text-blue-600"}`}
                        >
                          {option.displayPrice}
                        </span>
                        {selectedPlan === option.value && (
                          <div className="mt-2">
                            <Check className="w-6 h-6 text-blue-600 ml-auto" />
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedPlan && (
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-3 text-lg">Selected: {selectedPlanData?.label} Plan</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-blue-800">
                    <div>
                      <p>
                        <strong>Duration:</strong> {selectedPlanData?.label}
                      </p>
                      <p>
                        <strong>Price:</strong> {selectedPlanData?.displayPrice}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Features:</strong> {selectedPlanData?.features.length} included
                      </p>
                      <p>
                        <strong>Status:</strong> {selectedPlan === "3_days" ? "No payment needed" : "Payment required"}
                      </p>
                    </div>
                  </div>

                  {selectedPlan === "3_days" && (
                    <div className="mt-4 p-4 bg-green-100 rounded-lg border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Free Plan Benefits</span>
                      </div>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>✅ No credit card required</li>
                        <li>✅ Job goes live in seconds</li>
                        <li>✅ Reach qualified candidates immediately</li>
                        <li>✅ Perfect for testing our platform</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 text-center">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedPlan}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {selectedPlan === "3_days" ? (
                    <>
                      <Zap className="w-5 h-5" />
                      Post Job for Free
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Why Choose Our Free Plan?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Instant Activation</h4>
                    <p className="text-sm text-gray-600">
                      Your job goes live immediately, no waiting for payment processing
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Quality Candidates</h4>
                    <p className="text-sm text-gray-600">Access to our entire candidate database from day one</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Easy Upgrades</h4>
                    <p className="text-sm text-gray-600">Extend your posting anytime before it expires</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">Success Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Free jobs posted</span>
                  <span className="font-bold">12,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Avg. applications</span>
                  <span className="font-bold">23 per job</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Success rate</span>
                  <span className="font-bold">89%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
