"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface User {
  userId: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "ph-ride-user"

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      }
    } catch (error) {
      console.error("Failed to load user from storage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a UserProvider")
  }
  return context
}

// Helper to get userId with dev fallback
export function getUserId(): string | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.userId
    }
  } catch (error) {
    console.error("Failed to get userId:", error)
  }

  // Dev fallback: allow demo user in development
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ALLOW_DEMO_USER === "true") {
    return "demo-user-123"
  }

  return null
}

