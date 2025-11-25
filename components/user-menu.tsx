"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/lib/auth-client"
import { LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  isMobileNav?: boolean
}

export function UserMenu({ isMobileNav = false }: UserMenuProps) {
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
    // Mobile nav: show sign in as nav item style
    if (isMobileNav) {
      return (
        <a
          href="/auth"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all text-warm-gray/50 hover:text-warm-gray/70 active:bg-coral/5"
        >
          <div className="p-1.5 rounded-lg transition-colors">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Sign In</span>
        </a>
      )
    }
    return (
      <Button variant="outline" asChild className="border-coral/30 text-coral hover:bg-coral/5 hover:text-coral hover:border-coral h-9 sm:h-10 px-3 sm:px-4 text-sm">
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

  // Mobile nav style - matches other nav items
  if (isMobileNav) {
    return (
      <div className="relative flex-1" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl transition-all",
            isOpen 
              ? "text-coral" 
              : "text-warm-gray/50 hover:text-warm-gray/70 active:bg-coral/5"
          )}
          aria-label="User menu"
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            isOpen && "bg-coral/10"
          )}>
            <div className="w-5 h-5 rounded-full bg-gradient-coral flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{initials}</span>
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-semibold tracking-wide",
            isOpen && "text-coral"
          )}>
            Profile
          </span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-xl shadow-xl shadow-warm-gray/10 border border-border/60 py-2 z-50 animate-scale-in">
            <div className="px-3 py-2.5 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-warm-gray/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-warm-gray truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-[10px] text-warm-gray/50 truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="p-1.5">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-warm-gray hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop style
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-coral text-white font-bold text-xs sm:text-sm shadow-md shadow-coral/25 hover:shadow-lg hover:shadow-coral/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-warm-gray/10 border border-border/60 py-2 z-50 animate-scale-in">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cream flex items-center justify-center shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-warm-gray/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-warm-gray truncate">
                  {user.name || "User"}
                </p>
                <p className="text-[10px] sm:text-xs text-warm-gray/50 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="p-1.5 sm:p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-warm-gray hover:bg-red-50 hover:text-red-600 rounded-lg sm:rounded-xl transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
