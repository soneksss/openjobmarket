import { generateSEO } from "@/lib/seo"

export const metadata = generateSEO({
  title: 'About Open Job Market - Connecting Homeowners with Tradespeople',
  description: 'Open Job Market connects homeowners with trusted local tradespeople in seconds. Learn how our platform makes finding plumbers, electricians, builders and more fast and simple.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">About Open Job Market</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            A smarter way to find local trades — powered by location and availability.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">

        {/* Description */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 space-y-4">
          <p className="text-base leading-relaxed text-slate-300">
            Open Job Market is a modern, map-based platform that connects homeowners with nearby tradespeople using
            advanced location and availability logic. Instead of browsing endless directories or waiting days for
            replies, the platform works more like an Uber-style system for trades — helping homeowners quickly find
            the nearest available professionals when work needs to be done.
          </p>
          <p className="text-base leading-relaxed text-slate-400">
            Traditional trades platforms function like classified ads or directories: you search through long lists,
            send messages, and wait. Open Job Market takes a different approach. By combining interactive maps,
            real-time availability, and proximity-based discovery, the platform helps people connect faster and more efficiently.
          </p>
          <p className="text-base leading-relaxed text-slate-400">
            Homeowners can post a job and instantly reach tradespeople in their area. Tradespeople can see nearby
            work opportunities directly on the map and apply immediately.
          </p>
          <p className="text-base font-semibold text-emerald-400">
            Open Job Market is designed for the way people search for services today: fast, local, and on-demand.
          </p>
        </div>

        {/* How It Helps */}
        <h2 className="text-2xl font-bold text-center text-white">How Open Job Market Helps</h2>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-slate-800 rounded-xl border border-orange-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🔧</span>
                <h3 className="text-lg font-bold text-white">Tradespeople</h3>
              </div>
              <p className="text-orange-100 text-sm">Looking for more work nearby?</p>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {[
                  "Discover jobs around you on an interactive map",
                  "Apply instantly to local homeowners",
                  "Get found by people searching for your trade",
                  "Reduce downtime by filling gaps in your schedule",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
                    <span className="text-slate-300 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-blue-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🏠</span>
                <h3 className="text-lg font-bold text-white">Homeowners</h3>
              </div>
              <p className="text-blue-100 text-sm">Need a repair, installation, or renovation?</p>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {[
                  "Post a job with photos, description, and budget",
                  "Instantly reach tradespeople near your location",
                  "Receive applications and compare professionals",
                  "Choose the right contractor quickly and confidently",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
                    <span className="text-slate-300 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Why Different */}
        <div className="bg-gradient-to-br from-blue-950 to-purple-950 rounded-xl border border-blue-800/40 p-6">
          <h2 className="text-xl font-bold text-center text-white mb-5">Why Open Job Market Is Different</h2>
          <div className="space-y-3">
            {[
              { emoji: "📍", text: "Map-first experience – see jobs and professionals exactly where they are" },
              { emoji: "⚡", text: "Proximity-based matching – connect with the nearest available tradespeople" },
              { emoji: "🚀", text: "Uber-style logic – fast, on-demand connections instead of slow directories" },
              { emoji: "🤝", text: "Direct communication – no middlemen, no unnecessary steps" },
              { emoji: "🌍", text: "Built for local work – because most jobs happen close to home" },
            ].map(({ emoji, text }) => (
              <div key={text} className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 border border-white/10 flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{emoji}</span>
                <p className="text-slate-200 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
