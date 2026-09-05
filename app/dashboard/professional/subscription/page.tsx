import { redirect } from "next/navigation"

// Free for everyone — subscription screen hidden until paid features launch.
export default function ProfessionalSubscriptionPage() {
  redirect("/dashboard/professional")
}
