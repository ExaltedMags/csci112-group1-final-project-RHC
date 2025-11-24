"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/auth-client"
import { ITrip } from "@/models/Trip"
import HistoryView from "./history-view"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Define types for aggregation result
interface AggregationResult {
  _id: string;
  count: number;
  avgFare: number;
}

interface HistoryApiTrip extends ITrip {
  _id: string | { toString(): string }
  createdAt: string | Date
}

interface HistoryApiResponse {
  history: HistoryApiTrip[]
  analytics?: AggregationResult[]
}

interface AnalyticsSummary {
  savings?: {
    totalOverpay?: number
    avgOverpayPerTrip?: number
  }
  referralsPerProvider?: { providerCode: string; count: number }[]
}

export default function HistoryPage() {
  const { user, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const [history, setHistory] = useState<(ITrip & { _id: string })[]>([])
  const [analytics, setAnalytics] = useState<AggregationResult[]>([])
  const [savings, setSavings] = useState({ totalOverpay: 0, avgOverpayPerTrip: 0 })
  const [referrals, setReferrals] = useState<{ providerCode: string; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    // Redirect to auth if no user
    if (!user) {
      router.push("/auth")
      return
    }

    async function fetchHistory() {
      try {
        setIsLoading(true)
        const userId = user.userId

        // Fetch history and analytics
        const [historyRes, analyticsRes] = await Promise.all([
          fetch(`/api/history?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/analytics/summary?userId=${encodeURIComponent(userId)}`)
        ])

        if (!historyRes.ok || !analyticsRes.ok) {
          throw new Error("Failed to fetch history")
        }

        const historyData = (await historyRes.json()) as HistoryApiResponse
        const analyticsData = (await analyticsRes.json()) as AnalyticsSummary

        // Serialize history
        const serializedHistory = (historyData.history || []).map((doc) => ({
          ...doc,
          _id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
          quotes: doc.quotes.map((quote) => ({ ...quote })),
          selectedQuote: doc.selectedQuote ? { ...doc.selectedQuote } : undefined
        })) as (ITrip & { _id: string })[]

        setHistory(serializedHistory)
        setAnalytics(historyData.analytics || [])
        setSavings({
          totalOverpay: analyticsData.savings?.totalOverpay || 0,
          avgOverpayPerTrip: analyticsData.savings?.avgOverpayPerTrip || 0
        })
        setReferrals(analyticsData.referralsPerProvider || [])
      } catch (error) {
        console.error("Error fetching history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [user, authLoading, router])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Please sign in to view your trip history.</p>
              <Button asChild>
                <Link href="/auth">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <HistoryView
      history={history}
      analytics={analytics}
      savings={savings}
      referrals={referrals}
    />
  )
}
