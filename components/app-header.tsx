"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"

export function AppHeader() {
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
          PH Ride Compare
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/">Search</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/history">History</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/analytics">Analytics</Link>
          </Button>
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}

