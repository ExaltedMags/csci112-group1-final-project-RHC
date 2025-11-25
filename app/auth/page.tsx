"use client"

import { useState, useMemo, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MapPin, Sparkles, User, Mail } from "lucide-react"

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
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] p-4 bg-gradient-hero">
      {/* Logo */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-coral flex items-center justify-center shadow-lg shadow-coral/30">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-teal border-2 border-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-warm-gray tracking-tight">
          PH Ride Compare
        </h1>
        <p className="text-warm-gray/60 mt-2">
          Compare fares across Metro Manila
        </p>
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-warm-gray/10 bg-white animate-fade-in-up delay-100">
        <CardHeader className="pb-2 text-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-coral/10 text-coral text-sm font-medium mx-auto mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Welcome, Kabayan!</span>
          </div>
          <CardTitle className="text-xl font-bold text-warm-gray tracking-tight">Sign In to Continue</CardTitle>
          <CardDescription className="text-sm text-warm-gray/60 mt-2">
            Enter your email to start comparing ride fares
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in-up delay-150">
              <Label htmlFor="email" className="text-warm-gray font-semibold text-sm">
                Email Address
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray/40">
                  <Mail className="w-4 h-4" />
                </div>
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
                  className="pl-11 h-12 rounded-xl border-border/60 bg-cream/50 focus:bg-white focus:border-coral/50 focus:ring-2 focus:ring-coral/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 animate-fade-in-up delay-200">
              <Label htmlFor="name" className="text-warm-gray font-semibold text-sm">
                Nickname <span className="text-warm-gray/40 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray/40">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="pl-11 h-12 rounded-xl border-border/60 bg-cream/50 focus:bg-white focus:border-coral/50 focus:ring-2 focus:ring-coral/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-base font-bold shadow-xl shadow-coral/25 animate-fade-in-up delay-250"
              disabled={isButtonDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Continue
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-warm-gray/40 mt-6">
            New here? We&apos;ll create your account automatically.
          </p>
        </CardContent>
      </Card>

      {/* Trust indicators */}
      <div className="mt-8 flex items-center gap-6 text-sm text-warm-gray/50 animate-fade-in-up delay-300">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Grab</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span>Angkas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>JoyRide</span>
        </div>
      </div>
    </div>
  )
}
