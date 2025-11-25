"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  GlobalAnalyticsResponse,
  ProviderSurgeInsight,
  TimeSlotInsight,
  LocationInsight,
  getSurgeLevel,
  getSurgeLevelColor,
  formatPercentage,
  formatSurgeMultiplier,
} from "@/lib/types/analytics"
import { getProviderTheme } from "@/lib/provider-theme"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Zap,
  Award,
  Lightbulb,
  Building2,
  Plane,
  Home,
  Sun,
  Moon,
  Sunrise,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsViewProps {
  data: GlobalAnalyticsResponse
}

export default function AnalyticsView({ data }: AnalyticsViewProps) {
  const { surgeFrequencyByProvider, surgePatternsByTimeOfDay, surgePatternsByLocation } = data

  // Calculate total quotes for market share
  const totalQuotes = surgeFrequencyByProvider.reduce((acc, p) => acc + p.totalQuotes, 0)

  // Find market leader (most quotes)
  const marketLeader = surgeFrequencyByProvider.reduce((prev, curr) =>
    curr.totalQuotes > prev.totalQuotes ? curr : prev,
    surgeFrequencyByProvider[0]
  )

  // Find best value provider (lowest surge percentage)
  const bestValue = surgeFrequencyByProvider.reduce((prev, curr) =>
    curr.surgePercentage < prev.surgePercentage ? curr : prev,
    surgeFrequencyByProvider[0]
  )

  // Generate insights
  const insights = generateInsights(data, totalQuotes, marketLeader, bestValue)

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-2">
        <h1 className="text-4xl font-bold tracking-tight">Platform Analytics</h1>
      </div>

      {/* Provider Performance Section */}
      <section aria-labelledby="provider-performance-title">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 id="provider-performance-title" className="text-xl font-semibold">
            Provider Performance Comparison
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {surgeFrequencyByProvider.map((provider) => (
            <ProviderCard
              key={provider.provider}
              provider={provider}
              totalQuotes={totalQuotes}
              isMarketLeader={provider.provider === marketLeader?.provider}
              isBestValue={provider.provider === bestValue?.provider}
            />
          ))}
        </div>
      </section>

      {/* Provider Comparison Table */}
      <section aria-labelledby="comparison-table-title">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" id="comparison-table-title">
              Detailed Provider Metrics
            </CardTitle>
            <CardDescription>
              Side-by-side comparison of surge pricing statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Total Quotes</TableHead>
                  <TableHead className="text-right">Market Share</TableHead>
                  <TableHead className="text-right">Surge Frequency</TableHead>
                  <TableHead className="text-right">Avg Surge</TableHead>
                  <TableHead className="text-right">Max Surge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surgeFrequencyByProvider.map((provider) => {
                  const theme = getProviderTheme(provider.provider)
                  const marketShare = totalQuotes > 0 ? (provider.totalQuotes / totalQuotes) * 100 : 0
                  const surgeLevel = getSurgeLevel(provider.averageSurgeMultiplier)

                  return (
                    <TableRow key={provider.provider}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", theme.bg)}>
                            <theme.icon className={cn("h-4 w-4", theme.text)} />
                          </div>
                          <span className="font-medium">{provider.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {provider.totalQuotes.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", theme.accent)}
                              style={{ width: `${marketShare}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm w-12">
                            {formatPercentage(marketShare, 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono",
                            provider.surgePercentage >= 50 ? "text-red-600 border-red-200" :
                            provider.surgePercentage >= 25 ? "text-amber-600 border-amber-200" :
                            "text-emerald-600 border-emerald-200"
                          )}
                        >
                          {formatPercentage(provider.surgePercentage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-mono text-sm px-2 py-1 rounded", getSurgeLevelColor(surgeLevel))}>
                          {formatSurgeMultiplier(provider.averageSurgeMultiplier)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-mono text-sm px-2 py-1 rounded",
                          getSurgeLevelColor(getSurgeLevel(provider.maxSurgeMultiplier))
                        )}>
                          {formatSurgeMultiplier(provider.maxSurgeMultiplier)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Surge Patterns Section */}
      <section aria-labelledby="surge-patterns-title">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 id="surge-patterns-title" className="text-xl font-semibold">
            Surge Pricing Patterns
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Time of Day */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">By Time of Day</CardTitle>
              </div>
              <CardDescription>
                How surge pricing varies throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {surgePatternsByTimeOfDay.map((slot) => (
                <TimeSlotCard key={slot.timeSlot} slot={slot} />
              ))}
            </CardContent>
          </Card>

          {/* By Location Type */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">By Location Type</CardTitle>
              </div>
              <CardDescription>
                Surge rates based on pickup area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {surgePatternsByLocation.map((location) => (
                <LocationCard key={location.locationType} location={location} />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Insights Section */}
      {insights.length > 0 && (
        <section aria-labelledby="insights-title">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg" id="insights-title">Key Insights</CardTitle>
              </div>
              <CardDescription>
                Data-driven findings from platform analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 p-1 rounded-full shrink-0",
                      insight.type === 'positive' ? 'bg-emerald-100' :
                      insight.type === 'negative' ? 'bg-red-100' : 'bg-blue-100'
                    )}>
                      {insight.type === 'positive' ? (
                        <TrendingDown className="h-3 w-3 text-emerald-600" />
                      ) : insight.type === 'negative' ? (
                        <TrendingUp className="h-3 w-3 text-red-600" />
                      ) : (
                        <Lightbulb className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700">{insight.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

// Provider Card Component
interface ProviderCardProps {
  provider: ProviderSurgeInsight
  totalQuotes: number
  isMarketLeader: boolean
  isBestValue: boolean
}

function ProviderCard({ provider, totalQuotes, isMarketLeader, isBestValue }: ProviderCardProps) {
  const theme = getProviderTheme(provider.provider)
  const marketShare = totalQuotes > 0 ? (provider.totalQuotes / totalQuotes) * 100 : 0
  const surgeLevel = getSurgeLevel(provider.averageSurgeMultiplier)

  return (
    <Card className={cn(
      "relative overflow-hidden transition-shadow hover:shadow-md",
      isMarketLeader && "ring-2 ring-amber-400"
    )}>
      {/* Badge indicators */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {isMarketLeader && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5">
            <Award className="h-3 w-3 mr-0.5" aria-hidden="true" />
            Leader
          </Badge>
        )}
        {isBestValue && (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5">
            <TrendingDown className="h-3 w-3 mr-0.5" aria-hidden="true" />
            Low Surge
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg", theme.bg)}>
            <theme.icon className={cn("h-5 w-5", theme.text)} aria-hidden="true" />
          </div>
          <CardTitle className="text-lg">{provider.provider}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Share */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Market Share</span>
            <span className="font-semibold">{formatPercentage(marketShare, 0)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", theme.accent)}
              style={{ width: `${marketShare}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {provider.totalQuotes.toLocaleString()} quotes
          </p>
        </div>

        {/* Surge Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Surge Frequency</p>
            <p className={cn(
              "text-lg font-semibold",
              provider.surgePercentage >= 50 ? "text-red-600" :
              provider.surgePercentage >= 25 ? "text-amber-600" :
              "text-emerald-600"
            )}>
              {formatPercentage(provider.surgePercentage, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Multiplier</p>
            <p className={cn("text-lg font-semibold", getSurgeLevelColor(surgeLevel).split(' ')[0])}>
              {formatSurgeMultiplier(provider.averageSurgeMultiplier)}
            </p>
          </div>
        </div>

        {/* Max Surge */}
        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Max Surge Observed
          </span>
          <Badge variant="outline" className={cn(
            "font-mono",
            getSurgeLevelColor(getSurgeLevel(provider.maxSurgeMultiplier))
          )}>
            {formatSurgeMultiplier(provider.maxSurgeMultiplier)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Time Slot Card Component
function TimeSlotCard({ slot }: { slot: TimeSlotInsight }) {
  const surgeLevel = getSurgeLevel(slot.averageSurgeMultiplier)

  const getTimeIcon = (timeSlot: string) => {
    switch (timeSlot) {
      case 'Rush Hour':
        return <Sunrise className="h-4 w-4 text-orange-500" />
      case 'Late Night':
        return <Moon className="h-4 w-4 text-indigo-500" />
      default:
        return <Sun className="h-4 w-4 text-amber-500" />
    }
  }

  const getTimeDescription = (timeSlot: string) => {
    switch (timeSlot) {
      case 'Rush Hour':
        return '7-9 AM & 5-7 PM'
      case 'Late Night':
        return '10 PM - 5 AM'
      default:
        return 'Other hours'
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-background rounded-lg shadow-sm" aria-hidden="true">
          {getTimeIcon(slot.timeSlot)}
        </div>
        <div>
          <p className="font-medium text-sm">{slot.timeSlot}</p>
          <p className="text-xs text-muted-foreground">{getTimeDescription(slot.timeSlot)}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {slot.tripCount} trips
          </Badge>
          <span className={cn(
            "text-sm font-mono px-2 py-0.5 rounded",
            getSurgeLevelColor(surgeLevel)
          )}>
            {formatSurgeMultiplier(slot.averageSurgeMultiplier)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatPercentage(slot.surgePercentage)} with surge
        </p>
      </div>
    </div>
  )
}

// Location Card Component
function LocationCard({ location }: { location: LocationInsight }) {
  const surgeLevel = getSurgeLevel(location.averageSurgeMultiplier)
  const locationName = location.locationType === 'CBD'
    ? 'Central Business District (CBD)'
    : location.locationType

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'Airport':
        return <Plane className="h-4 w-4 text-blue-500" />
      case 'CBD':
        return <Building2 className="h-4 w-4 text-slate-600" />
      default:
        return <Home className="h-4 w-4 text-emerald-500" />
    }
  }

  const getLocationDescription = (locationType: string) => {
    switch (locationType) {
      case 'Airport':
        return 'NAIA terminals'
      case 'CBD':
        return 'Makati, BGC, Ortigas'
      default:
        return 'Other areas'
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-background rounded-lg shadow-sm" aria-hidden="true">
          {getLocationIcon(location.locationType)}
        </div>
        <div>
          <p className="font-medium text-sm">{locationName}</p>
          <p className="text-xs text-muted-foreground">{getLocationDescription(location.locationType)}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {location.tripCount} trips
          </Badge>
          <span className={cn(
            "text-sm font-mono px-2 py-0.5 rounded",
            getSurgeLevelColor(surgeLevel)
          )}>
            {formatSurgeMultiplier(location.averageSurgeMultiplier)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatPercentage(location.surgePercentage)} with surge
        </p>
      </div>
    </div>
  )
}

// Generate insights based on data
interface Insight {
  text: string
  type: 'positive' | 'negative' | 'neutral'
}

function generateInsights(
  data: GlobalAnalyticsResponse,
  totalQuotes: number,
  marketLeader: ProviderSurgeInsight | undefined,
  bestValue: ProviderSurgeInsight | undefined
): Insight[] {
  const insights: Insight[] = []
  const { surgeFrequencyByProvider, surgePatternsByTimeOfDay, surgePatternsByLocation } = data

  // Market leader insight
  if (marketLeader && totalQuotes > 0) {
    const share = ((marketLeader.totalQuotes / totalQuotes) * 100).toFixed(0)
    insights.push({
      text: `${marketLeader.provider} leads the market with ${share}% of all quotes`,
      type: 'neutral',
    })
  }

  // Best value provider insight
  if (bestValue && surgeFrequencyByProvider.length > 1) {
    const worstSurge = surgeFrequencyByProvider.reduce((prev, curr) =>
      curr.surgePercentage > prev.surgePercentage ? curr : prev,
      surgeFrequencyByProvider[0]
    )
    if (bestValue.provider !== worstSurge.provider) {
      const diff = (worstSurge.surgePercentage - bestValue.surgePercentage).toFixed(0)
      insights.push({
        text: `${bestValue.provider} has ${diff}% less surge frequency than ${worstSurge.provider}`,
        type: 'positive',
      })
    }
  }

  // Time-based insight
  const rushHour = surgePatternsByTimeOfDay.find(t => t.timeSlot === 'Rush Hour')
  const offPeak = surgePatternsByTimeOfDay.find(t => t.timeSlot === 'Off-Peak')
  if (rushHour && offPeak && rushHour.surgePercentage > offPeak.surgePercentage) {
    const diff = (rushHour.surgePercentage - offPeak.surgePercentage).toFixed(0)
    insights.push({
      text: `Rush hour has ${diff}% more surge pricing than off-peak hours - consider flexible timing`,
      type: 'negative',
    })
  }

  // Location-based insight
  const airport = surgePatternsByLocation.find(l => l.locationType === 'Airport')
  const residential = surgePatternsByLocation.find(l => l.locationType === 'Residential')
  if (airport && residential && airport.averageSurgeMultiplier > residential.averageSurgeMultiplier) {
    insights.push({
      text: `Airport pickups average ${formatSurgeMultiplier(airport.averageSurgeMultiplier)} surge vs ${formatSurgeMultiplier(residential.averageSurgeMultiplier)} in residential areas`,
      type: 'negative',
    })
  }

  // High surge warning
  const highSurgeProviders = surgeFrequencyByProvider.filter(p => p.surgePercentage >= 50)
  if (highSurgeProviders.length > 0) {
    insights.push({
      text: `${highSurgeProviders.map(p => p.provider).join(' and ')} apply surge pricing on more than half of quotes`,
      type: 'negative',
    })
  }

  // Low surge positive
  const lowSurgeProviders = surgeFrequencyByProvider.filter(p => p.surgePercentage < 25)
  if (lowSurgeProviders.length > 0) {
    insights.push({
      text: `${lowSurgeProviders.map(p => p.provider).join(' and ')} rarely apply surge pricing (<25% of quotes)`,
      type: 'positive',
    })
  }

  return insights.slice(0, 5) // Limit to 5 insights
}

