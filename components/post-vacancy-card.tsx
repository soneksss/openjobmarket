import Link from "next/link"
import { Users, ChevronRight } from "lucide-react"

// Shown at the top of the "Post a job" windows for businesses and signed-out
// visitors (who may be a business) — never for individual accounts, who can't
// post vacancies. Signed-out visitors go through the business sign-up first.
export const POST_VACANCY_PATH = "/jobs/vacancy/new"
export const EMPLOYER_SIGNUP_PATH = `/auth/sign-up?source=post-job&accountType=company&returnUrl=${encodeURIComponent(POST_VACANCY_PATH)}`

export function PostVacancyCard({ signedIn, onNavigate }: { signedIn: boolean; onNavigate?: () => void }) {
  return (
    <Link
      prefetch={false}
      href={signedIn ? POST_VACANCY_PATH : EMPLOYER_SIGNUP_PATH}
      onClick={onNavigate}
      className="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 transition-colors hover:bg-sky-100"
    >
      <span className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-white" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-900">Hiring staff for your business?</span>
        <span className="block text-xs text-slate-600">
          {signedIn ? "Post a vacancy instead of a trade job" : "Post a vacancy with a free business account"}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-sky-600 flex-shrink-0" />
    </Link>
  )
}
