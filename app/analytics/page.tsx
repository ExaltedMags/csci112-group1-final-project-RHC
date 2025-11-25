"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { GlobalAnalyticsResponse } from "@/lib/types/analytics"
import AnalyticsView from "./analytics-view"
import { AlertCircle, RefreshCw, BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  const [data, setData] = useState<GlobalAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/analytics/global")

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const analyticsData = await response.json() as GlobalAnalyticsResponse
      setData(analyticsData)
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Loading state
  if (isLoading) {
    return <AnalyticsLoadingSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <CardTitle>Unable to Load Analytics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (!data || isEmptyData(data)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-slate-100 w-fit">
              <BarChart3 className="h-6 w-6 text-slate-500" aria-hidden="true" />
            </div>
            <CardTitle>No Platform Data Yet</CardTitle>
            <CardDescription>
              There are no trips in the database to analyze. Run the seed script to populate
              analytics data, or start booking rides to generate real data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono text-muted-foreground">
              npm run seed-trips
            </div>
            <Button onClick={fetchAnalytics} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  return <AnalyticsView data={data} />
}

// Check if data is empty
function isEmptyData(data: GlobalAnalyticsResponse): boolean {
  return (
    data.surgeFrequencyByProvider.length === 0 &&
    data.surgePatternsByTimeOfDay.length === 0 &&
    data.surgePatternsByLocation.length === 0
  )
}

// Loading skeleton component
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      {/* Section title skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-64" />
      </div>

      {/* Provider cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            {[1, 2, 3].map((row) => (
              <div key={row} className="grid grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Surge patterns skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((card) => (
          <Card key={card}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

