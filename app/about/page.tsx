import { Metadata } from "next"
import { MapPin, Search, Users, Zap, Globe, MessageCircle, CheckCircle, Heart, TrendingUp } from "lucide-react"
import { generateSEOMetadata } from "@/lib/seo-metadata"

export const metadata: Metadata = generateSEOMetadata({
  title: "About Us - Our Story & Mission | OpenJobMarket",
  description: "Learn how OpenJobMarket is revolutionizing job search with map-based discovery. Connect jobseekers, employers, and tradespeople the easy way. Find opportunities near you instantly.",
  keywords: [
    "about OpenJobMarket",
    "our story",
    "job search platform",
    "map-based jobs",
    "company mission",
    "find jobs near me",
    "tradesperson platform"
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
              Our Story — Why We Built{" "}
              <span className="text-blue-200">OpenJobMarket</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light">
              Connecting Jobseekers, Employers, Tradespeople & Talent — The Easy Way
            </p>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border-l-4 border-blue-600">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Heart className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  OpenJobMarket was created with one mission:<br />
                  <span className="text-blue-600 font-semibold text-2xl">
                    Connect Jobseekers, Employers, Tradespeople, and Talent in a very easy way.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="container mx-auto px-4 py-16 md:py-20 bg-muted/30 rounded-3xl my-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            We Listened to Real People
          </h2>
          <p className="text-lg text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
            Before building this platform, our team spent months speaking to job seekers, tradespeople,
            companies, and homeowners. We kept hearing the same frustrations:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              "I don't have time to look for a new job.",
              "I'm too busy to send CVs everywhere.",
              "I hate searching on multiple websites.",
              "Why is it so hard to find someone local and available today?"
            ].map((quote, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md border-l-4 border-orange-500">
                <p className="text-lg italic text-gray-700">"{quote}"</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 text-center">
            <p className="text-xl font-semibold text-blue-900 mb-2">
              At the same time, people told us they valued one thing above all:
            </p>
            <p className="text-2xl font-bold text-blue-600">
              A good job — or a good worker — should be close to home.
            </p>
            <p className="text-lg text-gray-700 mt-4">
              Nobody enjoys wasting hours in traffic. Nobody likes scrolling endlessly.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              So We Asked Ourselves...
            </h2>
            <div className="space-y-6 text-xl md:text-2xl">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
                <p className="font-semibold text-green-900">
                  💡 What if you could simply look at a map…<br />
                  and see every opportunity around you?
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200">
                <p className="font-semibold text-purple-900">
                  💡 What if you could put yourself on the market —<br />
                  and let the right job or client find YOU?
                </p>
              </div>
            </div>
            <div className="mt-8 inline-block bg-blue-600 text-white px-8 py-4 rounded-full text-2xl font-bold shadow-lg">
              Everyone loved the idea. ✨
            </div>
            <p className="text-xl font-semibold mt-6 text-gray-700">
              And that's exactly what we built.
            </p>
          </div>
        </div>
      </section>

      {/* Map-Based Platform */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8 justify-center">
              <MapPin className="h-12 w-12" />
              <h2 className="text-3xl md:text-4xl font-bold">
                A Job Platform Designed Like a Map
              </h2>
            </div>
            <p className="text-xl text-center text-blue-100 mb-8">
              Because That's How People Search
            </p>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8">
              <p className="text-lg leading-relaxed">
                OpenJobMarket is <strong>fully map-based</strong>, similar to Google Maps, because the most
                natural way to find something is to see it right where it exists.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Search, title: "Vacancies", color: "from-blue-500 to-cyan-500" },
                { icon: Users, title: "Tradespeople", color: "from-purple-500 to-pink-500" },
                { icon: TrendingUp, title: "Talent", color: "from-orange-500 to-red-500" },
                { icon: Globe, title: "Remote Jobs", color: "from-green-500 to-emerald-500" },
                { icon: Zap, title: "Contract Work", color: "from-yellow-500 to-amber-500" },
                { icon: MessageCircle, title: "Local Services", color: "from-indigo-500 to-blue-500" }
              ].map((item, index) => (
                <div key={index} className="bg-white/20 backdrop-blur rounded-xl p-6 text-center hover:bg-white/30 transition-all">
                  <div className={`inline-block p-3 bg-gradient-to-br ${item.color} rounded-lg mb-3`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{item.title}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <p className="text-2xl font-bold mb-4">Just open the map and see everything instantly.</p>
              <div className="space-y-2 text-lg">
                <p className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  No complicated filters
                </p>
                <p className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  No endless scrolling
                </p>
                <p className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  Just tap the map
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Integration */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <Globe className="h-12 w-12" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Deep Integration With Google + ChatGPT
              </h2>
            </div>
            <p className="text-xl mb-8 text-blue-100">
              Our platform is deeply integrated with Google and ChatGPT AI, meaning:
            </p>
            <div className="space-y-4">
              {[
                "Every vacancy you post",
                "Every service you offer",
                "Every professional profile"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-lg">
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-white/20 backdrop-blur rounded-xl p-6">
              <p className="text-xl font-semibold">
                …becomes automatically searchable globally.
              </p>
              <p className="text-lg mt-2 text-blue-100">
                You get more visibility, more traffic, and more opportunities to be found — without lifting a finger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Homeowners Section */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-50 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
              A Better Way for Homeowners to Find Tradespeople
            </h2>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <p className="text-lg mb-6 leading-relaxed">
                Many homeowners today post small jobs on Facebook or ask for recommendations, hoping to find
                someone available right now. Others use big job-posting platforms — but those often come with
                major downsides:
              </p>
              <div className="space-y-3">
                {[
                  "Homeowners get flooded by companies aggressively pushing their services",
                  "Many of those companies overcharge, because they paid just to see your contact details",
                  "It's hard to know who is truly local, available, or fairly priced"
                ].map((issue, index) => (
                  <div key={index} className="flex gap-3 text-red-700 bg-red-50 p-4 rounded-lg">
                    <span className="text-2xl">❌</span>
                    <p>{issue}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle className="h-8 w-8" />
                We wanted to fix that.
              </h3>
              <p className="text-xl mb-6">With OpenJobMarket, it works differently:</p>
              <ol className="space-y-4 text-lg">
                <li className="flex gap-3">
                  <span className="font-bold text-green-200 text-xl">1.</span>
                  <span>You post a job (even a small task) with your budget</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-200 text-xl">2.</span>
                  <span>Tradespeople instantly see it on the map</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-200 text-xl">3.</span>
                  <span>They apply directly</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-200 text-xl">4.</span>
                  <div>
                    <p className="mb-2">You choose who to contact based on:</p>
                    <ul className="ml-6 space-y-1 text-green-100">
                      <li>• Their location</li>
                      <li>• Real reviews</li>
                      <li>• Experience and skills</li>
                      <li>• Their quote</li>
                    </ul>
                  </div>
                </li>
              </ol>
              <div className="mt-8 pt-6 border-t border-green-400">
                <div className="space-y-2 text-lg">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    No middlemen
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    No inflated prices
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    No spam
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white rounded-xl p-6 border-l-4 border-blue-500 shadow-md">
              <p className="text-lg italic text-gray-700">
                <strong>A little truth homeowners know well:</strong><br />
                Tradespeople who aren't overloaded with work often offer the best prices.
              </p>
              <p className="text-lg font-semibold text-blue-600 mt-2">
                OpenJobMarket helps you find them instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Matter */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why We Believe OpenJobMarket Matters
          </h2>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-3xl p-8 md:p-12 shadow-2xl mb-12">
            <div className="space-y-4 text-xl md:text-2xl text-center">
              <p className="font-light">Work should be <strong className="font-bold">accessible</strong>.</p>
              <p className="font-light">Opportunities should be <strong className="font-bold">visible</strong>.</p>
              <p className="font-light">And finding the right person — or the right job — should <strong className="font-bold">not take hours</strong> of searching.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h3 className="text-2xl font-bold mb-6 text-center">
              We built OpenJobMarket to make the entire process effortless:
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Simple registration",
                "Easy CV builder",
                "Global reach",
                "Map-based job discovery",
                "Real reviews and transparent pricing",
                "Opportunities that come to you"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <span className="text-lg font-medium text-gray-800">{feature}</span>
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
              Whether you're a job seeker, a freelancer, a tradesperson,<br />
              a company, or a homeowner...
            </h2>
            <p className="text-2xl md:text-3xl text-blue-100 font-light">
              OpenJobMarket gives you a faster, smarter, and more human way to connect.
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
