export const runtime = 'nodejs';
import { Metadata } from "next"
import { MapPin, Search, Users, CheckCircle, Award, Eye, Shield, Zap } from "lucide-react"
import { generateSEOMetadata } from "@/lib/seo-metadata"

export const metadata: Metadata = generateSEOMetadata({
  title: "About Us - What Is Open Job Market | OpenJobMarket",
  description: "Open Job Market is an award-nominated, map-based platform to search, compare, and connect with jobs, talent, skilled tradespeople, and trade work — all in one place.",
  keywords: [
    "about OpenJobMarket",
    "map-based job search",
    "job search platform",
    "find jobs near me",
    "tradesperson platform",
    "talent platform"
  ],
  path: "/about"
})

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              What Is <span className="text-blue-200">Open Job Market</span>?
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light">
              Every opportunity. One map. One platform.
            </p>
          </div>
        </div>
      </section>

      {/* Main Description */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border-l-4 border-blue-600 mb-12">
            <p className="text-xl md:text-2xl leading-relaxed mb-6">
              Open Job Market is an <strong className="text-blue-600">award-nominated, map-based platform</strong> to search, compare, and connect with jobs, talent, skilled tradespeople, and trade work — all in one place.
            </p>
            <div className="flex items-center gap-3 text-lg text-muted-foreground">
              <Award className="h-6 w-6 text-yellow-500" />
              <p>Recognized by industry experts as one of the most promising startups of the year.</p>
            </div>
          </div>

          {/* Search Smarter */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Search className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-bold">Search Smarter</h2>
            </div>
            <p className="text-lg mb-4">Find opportunities visually with an easy map-based search.</p>
            <p className="text-lg">Use advanced filters for location, skills, salary, and availability — and choose the best match in seconds.</p>
          </div>

          {/* Private by Default */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl md:text-3xl font-bold">Private by Default</h2>
            </div>
            <p className="text-lg mb-4">Browse and compare anonymously.</p>
            <p className="text-lg">No pressure. No data exposure. You control what you share.</p>
          </div>
        </div>
      </section>

      {/* Built for Everyone */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Built for Everyone</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Job Seekers & Talent */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-8 w-8 text-blue-300" />
                  <h3 className="text-xl font-bold">Job Seekers & Talent</h3>
                </div>
                <p className="text-lg text-blue-100">Find jobs, freelance work, or get discovered by employers.</p>
              </div>

              {/* Employers & Companies */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-8 w-8 text-green-300" />
                  <h3 className="text-xl font-bold">Employers & Companies</h3>
                </div>
                <p className="text-lg text-blue-100">Post jobs fast or search qualified local candidates.</p>
              </div>

              {/* Tradespeople */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-8 w-8 text-yellow-300" />
                  <h3 className="text-xl font-bold">Tradespeople</h3>
                </div>
                <p className="text-lg text-blue-100">Show your skills and get hired nearby.</p>
              </div>

              {/* Homeowners */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="h-8 w-8 text-orange-300" />
                  <h3 className="text-xl font-bold">Homeowners</h3>
                </div>
                <p className="text-lg text-blue-100">Find trusted local professionals and compare with confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Open Job Market */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Open Job Market?</h2>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
            <div className="space-y-4">
              {[
                "Map-based discovery",
                "Advanced filters",
                "Secure & private",
                "All-in-one platform",
                "Free to search"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4 text-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Open Job Market
            </h2>
            <p className="text-2xl md:text-3xl text-blue-100 font-light">
              Every opportunity. One map. One platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <a
                href="/auth/sign-up"
                className="inline-block px-8 py-4 bg-white text-blue-900 font-bold text-lg rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
              >
                Get Started Free
              </a>
              <a
                href="/jobs"
                className="inline-block px-8 py-4 bg-blue-700 text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-colors shadow-lg border-2 border-white/20"
              >
                Explore Jobs on Map
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
