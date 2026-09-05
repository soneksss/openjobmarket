import { redirect } from "next/navigation"

// Open Job Market is currently free for everyone. The membership / pricing
// experience is hidden until paid features launch. The previous implementation
// is preserved in git history and can be restored when monetisation begins.
export default function MembershipPage() {
  redirect("/home")
}
