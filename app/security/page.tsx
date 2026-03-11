import { Shield, Lock, Eye, AlertTriangle } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-7 w-7 text-emerald-400 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">Security & Trust</h1>
              <p className="text-slate-400 text-sm mt-0.5">Learn about our security measures and how we protect your data</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-700/50 rounded-xl border border-slate-600/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <h2 className="font-semibold text-white">Data Encryption</h2>
                <span className="ml-auto text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-sm text-slate-400">
                All data is encrypted in transit and at rest using industry-standard AES-256 encryption to protect your information.
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-xl border border-slate-600/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                <h2 className="font-semibold text-white">Privacy Controls</h2>
                <span className="ml-auto text-xs bg-slate-600/50 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">Configurable</span>
              </div>
              <p className="text-sm text-slate-400">
                Granular privacy controls let you decide who can see your profile, contact information, and job application history.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-base font-bold text-white mb-4">Security Features</h2>
            <div className="space-y-4">
              {[
                { title: "Secure Authentication", desc: "Multi-factor authentication and secure password requirements" },
                { title: "Regular Security Audits", desc: "Third-party security assessments and vulnerability testing" },
                { title: "GDPR Compliance", desc: "Full compliance with European data protection regulations" },
                { title: "Access Controls", desc: "Role-based access controls ensure users only see data relevant to them" },
                { title: "Incident Response", desc: "Dedicated process for responding to and resolving security incidents" },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-white text-sm">{title}</h3>
                    <p className="text-sm text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-300 mb-1">Report Security Issues</h3>
                <p className="text-sm text-amber-400/80">
                  If you discover a security vulnerability, please report it to{" "}
                  <a href="mailto:security@openjobmarket.com" className="text-amber-300 hover:text-amber-200 underline">
                    security@openjobmarket.com
                  </a>
                  . We take all reports seriously and will respond within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
