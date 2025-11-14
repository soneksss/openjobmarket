export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Job Board Platform Demos</h1>
          <p className="text-gray-600">Explore the key features of our job board platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🆓</span>
            </div>
            <h2 className="text-xl font-semibold mb-3">Free Plan Job Posting</h2>
            <p className="text-gray-600 mb-4">
              See how users can post jobs for free with our 3-day plan option. No payment required, immediate posting.
            </p>
            <a
              href="/demo/free-plan"
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Free Plan Demo
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h2 className="text-xl font-semibold mb-3">Paid Plans & Extensions</h2>
            <p className="text-gray-600 mb-4">
              Explore premium features including extended visibility, priority placement, and advanced analytics.
            </p>
            <button disabled className="inline-block bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Features</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-medium">Instant Posting</h4>
              <p className="text-sm text-gray-600">Free jobs go live immediately</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium">Analytics</h4>
              <p className="text-sm text-gray-600">Track views and applications</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">🔄</div>
              <h4 className="font-medium">Easy Extensions</h4>
              <p className="text-sm text-gray-600">Upgrade anytime before expiry</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
