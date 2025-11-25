"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

  return (
    <header className="border-b border-border/60 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
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
            <span className="text-[10px] font-medium text-warm-gray/50 tracking-wide hidden sm:block">
              Metro Manila
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href))
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
                  <span className="hidden sm:inline">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-coral rounded-full" />
                  )}
                </Link>
              </Button>
            )
          })}
          
          <div className="w-px h-8 bg-border mx-2 hidden sm:block" />
          
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}
