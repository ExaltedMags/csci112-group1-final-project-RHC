"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"

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

  const loadUser = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to load user from storage:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Load user from localStorage on mount
    loadUser()

    // Listen for storage changes (e.g., when user logs in from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadUser()
      }
    }

    // Listen for custom auth event (for same-tab updates)
    const handleAuthChange = () => {
      loadUser()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("auth-change", handleAuthChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("auth-change", handleAuthChange)
    }
  }, [loadUser])

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

