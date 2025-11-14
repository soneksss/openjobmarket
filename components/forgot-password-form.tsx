"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, X, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { forgotPassword } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending Reset Link...
        </>
      ) : (
        "Send Reset Link"
      )}
    </Button>
  )
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, null)

  return (
    <Card className="w-full max-w-md relative">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-muted z-10 rounded-full"
      >
        <Link href="/">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Link>
      </Button>

      <CardHeader className="text-center pt-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary rounded-full">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-700 px-4 py-3 rounded-md text-sm">
              {state.success}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-base font-medium">
              Email Address
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <SubmitButton />

          <div className="text-center">
            <Link href="/auth/login" className="inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
