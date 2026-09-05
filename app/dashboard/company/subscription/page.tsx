import { redirect } from "next/navigation"

// Open Job Market is free for tradespeople. The subscription / membership
// screen is hidden until paid features launch — previous implementation is in
// git history.
export default function CompanySubscriptionPage() {
  redirect("/dashboard/company")
}
