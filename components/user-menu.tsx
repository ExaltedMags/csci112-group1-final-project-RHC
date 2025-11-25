"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/lib/auth-client"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
  const { user, signOut } = useCurrentUser()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!user) {
    return (
      <Button variant="outline" asChild className="border-coral/30 text-coral hover:bg-coral/5 hover:text-coral hover:border-coral">
        <a href="/auth">Sign In</a>
      </Button>
    )
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  const handleSignOut = () => {
    signOut()
    setIsOpen(false)
    router.push("/auth")
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-coral text-white font-bold text-sm shadow-md shadow-coral/25 hover:shadow-lg hover:shadow-coral/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-warm-gray/10 border border-border/60 py-2 z-50 animate-scale-in">
          <div className="px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center">
                <User className="w-5 h-5 text-warm-gray/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-warm-gray truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-warm-gray/50 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-warm-gray hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
