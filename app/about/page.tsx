export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">About Open Job Market</h1>
            <p className="text-lg md:text-xl text-blue-100">
              A smarter way to find local trades — powered by location and availability.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Description */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
            <p className="text-base leading-relaxed text-slate-800">
              Open Job Market is a modern, map-based platform that connects homeowners with nearby tradespeople using
              advanced location and availability logic. Instead of browsing endless directories or waiting days for
              replies, the platform works more like an Uber-style system for trades — helping homeowners quickly find
              the nearest available professionals when work needs to be done.
            </p>
            <p className="text-base leading-relaxed text-slate-700">
              Traditional trades platforms function like classified ads or directories: you search through long lists,
              send messages, and wait. Open Job Market takes a different approach. By combining interactive maps,
              real-time availability, and proximity-based discovery, the platform helps people connect faster and more
              efficiently.
            </p>
            <p className="text-base leading-relaxed text-slate-700">
              Homeowners can post a job and instantly reach tradespeople in their area. Tradespeople can see nearby
              work opportunities directly on the map and apply immediately. This reduces delays, eliminates unnecessary
              back-and-forth, and helps both sides connect when timing and location matter most.
            </p>
            <p className="text-base leading-relaxed font-semibold text-blue-700">
              Open Job Market is designed for the way people search for services today: fast, local, and on-demand.
            </p>
          </div>

          {/* How It Helps */}
          <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-800">
            How Open Job Market Helps
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Tradespeople */}
            <div className="bg-white rounded-lg shadow-md border-2 border-orange-400 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="bg-orange-500 text-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">🔧</span>
                  <h3 className="text-xl font-bold">Tradespeople</h3>
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
                      <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                      <span className="text-slate-700 text-sm font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Homeowners */}
            <div className="bg-white rounded-lg shadow-md border-2 border-blue-400 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="bg-blue-600 text-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">🏠</span>
                  <h3 className="text-xl font-bold">Homeowners</h3>
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
                      <span className="text-green-600 font-bold text-lg mt-0.5">✓</span>
                      <span className="text-slate-700 text-sm font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Why Different */}
          <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-center text-white mb-5">
              Why Open Job Market Is Different
            </h2>
            <div className="space-y-3">
              {[
                { emoji: "📍", text: "Map-first experience – see jobs and professionals exactly where they are" },
                { emoji: "⚡", text: "Proximity-based matching – connect with the nearest available tradespeople" },
                { emoji: "🚀", text: "Uber-style logic – fast, on-demand connections instead of slow directories" },
                { emoji: "🤝", text: "Direct communication – no middlemen, no unnecessary steps" },
                { emoji: "🌍", text: "Built for local work – because most jobs happen close to home" },
              ].map(({ emoji, text }) => (
                <div key={text} className="bg-white/20 backdrop-blur rounded-lg px-5 py-3 border border-white/30 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{emoji}</span>
                  <p className="text-white font-medium text-sm md:text-base">{text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
