"use client"

import { useState, useMemo, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, Mail } from "lucide-react"

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
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-8rem)] px-3 sm:p-4 bg-gradient-hero">
      {/* Logo */}
      <div className="text-center mb-5 sm:mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2.5 mb-3 sm:mb-4">
          <div className="relative">
            <Image 
              src="/app-logo.png" 
              alt="PH Ride Compare Logo" 
              width={48} 
              height={48} 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-lg shadow-coral/30 object-contain"
            />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-gray tracking-tight">
          PH Ride Compare
        </h1>
        <p className="text-warm-gray/60 mt-1.5 sm:mt-2 text-sm sm:text-base">
          Compare fares across Metro Manila
        </p>
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-warm-gray/10 bg-white animate-fade-in-up delay-100 mx-2 sm:mx-0">
        <CardHeader className="pb-2 text-center px-4 sm:px-6">
          <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-coral/10 text-coral text-xs sm:text-sm font-medium mx-auto mb-2">
            <span>Welcome, Kabayan!</span>
          </div>
          <CardTitle className="text-lg sm:text-xl font-bold text-warm-gray tracking-tight">Sign In to Continue</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-warm-gray/60 mt-1.5 sm:mt-2">
            Enter your email to start comparing ride fares
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5 sm:space-y-2 animate-fade-in-up delay-150">
              <Label htmlFor="email" className="text-warm-gray font-semibold text-xs sm:text-sm">
                Email Address
              </Label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-warm-gray/40">
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
                  className="pl-10 sm:pl-11 h-11 sm:h-12 rounded-xl border-border/60 bg-cream/50 focus:bg-white focus:border-coral/50 focus:ring-2 focus:ring-coral/20 transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 animate-fade-in-up delay-200">
              <Label htmlFor="name" className="text-warm-gray font-semibold text-xs sm:text-sm">
                Nickname <span className="text-warm-gray/40 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-warm-gray/40">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 sm:pl-11 h-11 sm:h-12 rounded-xl border-border/60 bg-cream/50 focus:bg-white focus:border-coral/50 focus:ring-2 focus:ring-coral/20 transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold shadow-xl shadow-coral/25 animate-fade-in-up delay-250"
              disabled={isButtonDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Continue
                </>
              )}
            </Button>
          </form>

          <p className="text-[10px] sm:text-xs text-center text-warm-gray/40 mt-4 sm:mt-6">
            New here? We&apos;ll create your account automatically.
          </p>
        </CardContent>
      </Card>

      {/* Trust indicators */}
      <div className="mt-5 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-warm-gray/50 animate-fade-in-up delay-300">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500" />
          <span>Grab</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-500" />
          <span>Angkas</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500" />
          <span>JoyRide</span>
        </div>
      </div>
    </div>
  )
}
