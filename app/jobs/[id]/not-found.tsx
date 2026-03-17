import Link from "next/link"
import { Briefcase, ArrowLeft } from "lucide-react"

export default function JobNotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800 rounded-full p-5">
            <Briefcase className="w-10 h-10 text-slate-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Job No Longer Available</h1>
        <p className="text-slate-400 mb-8">
          This job has been removed or filled. Check out other open opportunities nearby.
        </p>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Open Jobs
        </Link>
      </div>
    </div>
  )
}
