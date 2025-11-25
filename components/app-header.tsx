"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { Search, History, BarChart3, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Search", icon: Search },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function AppHeader() {
  const pathname = usePathname()

  // Don't show bottom nav on progress/handoff pages (they have their own nav)
  const hideBottomNav = pathname.includes("/progress") || pathname.includes("/handoff")

  const navContainerRef = useRef<HTMLDivElement>(null)
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 })

  const activeNavIndex = navItems.findIndex(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  )

  useEffect(() => {
    const updateUnderline = () => {
      if (activeNavIndex === -1) {
        setUnderlineStyle((prev) => (prev.width === 0 ? prev : { width: 0, left: prev.left }))
        return
      }

      const container = navContainerRef.current
      const target = navItemRefs.current[activeNavIndex]

      if (!container || !target) return

      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()

      const targetWidth = Math.max(40, Math.min(targetRect.width - 12, 80))
      const left = targetRect.left - containerRect.left + (targetRect.width - targetWidth) / 2

      setUnderlineStyle({ width: targetWidth, left })
    }

    updateUnderline()
    window.addEventListener("resize", updateUnderline)
    return () => window.removeEventListener("resize", updateUnderline)
  }, [activeNavIndex, pathname])

  return (
    <>
      {/* Desktop Header - Hidden on mobile */}
      <header className="bg-transparent sticky top-0 z-50 hidden md:block">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-coral flex items-center justify-center shadow-md shadow-coral/20 group-hover:shadow-lg group-hover:shadow-coral/30 transition-shadow">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal border-2 border-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-warm-gray leading-tight">
                PH Ride Compare
              </span>
              <span className="text-[10px] font-medium text-warm-gray/50 tracking-wide">
                Metro Manila
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item, index) => {
              const isActive = activeNavIndex === index
              const Icon = item.icon

              return (
                <Button 
                  key={item.href}
                  variant="ghost" 
                  asChild
                  className={cn(
                    "relative px-4 py-2 h-10 font-medium text-warm-gray/70 hover:text-warm-gray hover:bg-coral/5 transition-colors",
                    isActive && "text-coral bg-coral/10 hover:bg-coral/10 hover:text-coral"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <Icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-coral" : "text-warm-gray/50"
                    )} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-coral rounded-full" />
                    )}
                  </Link>
                </Button>
              )
            })}
            
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Mobile Header - Compact logo only */}
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 md:hidden border-b border-border/40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-center">
          {/* Compact Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-coral flex items-center justify-center shadow-md shadow-coral/20">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal border-2 border-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-warm-gray">
              PH Ride Compare
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-border/60 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center h-16 px-2 max-w-md mx-auto gap-2">
            <div className="relative flex flex-1 items-center justify-between gap-2" ref={navContainerRef}>
              {navItems.map((item, index) => {
                const isActive = activeNavIndex === index
                const Icon = item.icon

                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    ref={(el) => (navItemRefs.current[index] = el)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all",
                      isActive 
                        ? "text-coral" 
                        : "text-warm-gray/50 hover:text-warm-gray/70 active:bg-coral/5"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isActive && "bg-coral/10"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      isActive && "text-coral"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}

              {underlineStyle.width > 0 && (
                <div 
                  className="absolute bottom-1 h-1 bg-coral rounded-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
                  style={{
                    width: underlineStyle.width,
                    transform: `translateX(${underlineStyle.left}px)`
                  }}
                />
              )}
            </div>

            {/* Profile in bottom nav */}
            <div className="flex items-center justify-center min-w-[64px]">
              <UserMenu isMobileNav />
            </div>
          </div>
        </nav>
      )}
    </>
  )
}
