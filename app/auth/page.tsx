"use client"

import { useState, useMemo, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isButtonDisabled = useMemo(() => {
    return isLoading || !email.trim()
  }, [isLoading, email])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to sign in")
      }

      const user = await res.json()

      // Store user in localStorage
      localStorage.setItem("ph-ride-user", JSON.stringify({
        userId: user.userId,
        email: user.email,
        name: user.name,
      }))

      // Trigger custom event to notify UserProvider
      window.dispatchEvent(new Event("auth-change"))

      // Redirect to home page
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Sign-in error:", err)
      setError(err instanceof Error ? err.message : "Something went wrong")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)] p-4 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <Card className="w-full max-w-md border-0 sm:border shadow-none sm:shadow-xl sm:border-slate-100 bg-transparent sm:bg-white/95 sm:backdrop-blur">
        <CardHeader className="px-0 sm:px-6 pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-2">
            Enter your email to continue. We&apos;ll create an account if you&apos;re new.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name or nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={isButtonDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

