"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  GlobalAnalyticsResponse,
  ProviderSurgeInsight,
  TimeSlotInsight,
  LocationInsight,
  RouteAnalytics,
  getSurgeLevel,
  getSurgeLevelColor,
  formatPercentage,
  formatSurgeMultiplier,
  formatCurrency,
} from "@/lib/types/analytics"
import { getProviderTheme } from "@/lib/provider-theme"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { ProviderLogo } from "@/components/provider-logo"
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
  Route,
  ArrowRight,
  Trophy,
  ChevronDown,
  BarChart3,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsViewProps {
  data: GlobalAnalyticsResponse
}

// Collapsible Section Header Component
interface CollapsibleSectionHeaderProps {
  icon?: React.ReactNode
  title: string
  titleId: string
  isOpen: boolean
  onToggle: () => void
}

function CollapsibleSectionHeader({
  icon,
  title,
  titleId,
  isOpen,
  onToggle,
}: CollapsibleSectionHeaderProps) {
  return (
    <CollapsibleTrigger
      type="button"
      onClick={onToggle}
      className="inline-flex w-full items-center gap-2 text-left cursor-pointer group"
    >
      {icon}
      <div className="inline-flex items-center gap-1">
        <h2 id={titleId} className="text-base sm:text-xl font-bold text-warm-gray group-hover:text-coral transition-colors">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 sm:h-5 sm:w-5 text-warm-gray/50 transition-transform duration-200 shrink-0 group-hover:text-coral",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
          aria-hidden="true"
        />
      </div>
    </CollapsibleTrigger>
  )
}

const formatProviderName = (providerId: string) => PROVIDER_LABELS[providerId] ?? providerId

export default function AnalyticsView({ data }: AnalyticsViewProps) {
  const { surgeFrequencyByProvider, surgePatternsByTimeOfDay, surgePatternsByLocation, topRoutes } = data

  // Collapsible state for each section
  const [providerPerformanceOpen, setProviderPerformanceOpen] = useState(true)
  const [detailedMetricsOpen, setDetailedMetricsOpen] = useState(true)
  const [topRoutesOpen, setTopRoutesOpen] = useState(true)
  const [surgePatternsOpen, setSurgePatternsOpen] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(true)

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
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="pb-2 animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-warm-gray">
          Platform Analytics
        </h1>
        <p className="text-warm-gray/60 mt-1 sm:mt-2 text-sm sm:text-base">
          Discover fare patterns and find the best times to ride
        </p>
      </div>

      {/* Provider Performance Section */}
      <Collapsible open={providerPerformanceOpen} onOpenChange={setProviderPerformanceOpen}>
        <section aria-labelledby="provider-performance-title" className="animate-fade-in-up delay-100">
          <div className="mb-3 sm:mb-4">
            <CollapsibleSectionHeader
              icon={<div className="p-1.5 sm:p-2 rounded-lg bg-coral/10"><Award className="h-4 w-4 sm:h-5 sm:w-5 text-coral" /></div>}
              title="Provider Performance"
              titleId="provider-performance-title"
              isOpen={providerPerformanceOpen}
              onToggle={() => setProviderPerformanceOpen(!providerPerformanceOpen)}
            />
          </div>
          <CollapsibleContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {surgeFrequencyByProvider.map((provider, index) => (
                        <div key={provider.provider} className={cn("animate-fade-in-up", `delay-${(index + 1) * 100}`)}>
                          <ProviderCard
                            provider={provider}
                            totalQuotes={totalQuotes}
                            isMarketLeader={provider.provider === marketLeader?.provider}
                            isBestValue={provider.provider === bestValue?.provider}
                          />
                        </div>
                      ))}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      {/* Provider Comparison - Detailed Metrics */}
      <Collapsible open={detailedMetricsOpen} onOpenChange={setDetailedMetricsOpen}>
        <section aria-labelledby="comparison-table-title" className="animate-fade-in-up delay-200">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CollapsibleTrigger
                type="button"
                onClick={() => setDetailedMetricsOpen(!detailedMetricsOpen)}
                className="flex flex-col gap-1 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-coral/10">
                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
                  </div>
                  <CardTitle className="text-sm sm:text-lg group-hover:text-coral transition-colors" id="comparison-table-title">
                    Detailed Metrics
                  </CardTitle>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5 text-warm-gray/50 transition-transform duration-200 shrink-0",
                      detailedMetricsOpen ? "rotate-0" : "-rotate-90"
                    )}
                    aria-hidden="true"
                  />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="px-3 sm:px-6">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {surgeFrequencyByProvider.map((provider) => {
                    const theme = getProviderTheme(provider.provider)
                    const providerName = formatProviderName(provider.provider)
                    const marketShare = totalQuotes > 0 ? (provider.totalQuotes / totalQuotes) * 100 : 0
                    const surgeLevel = getSurgeLevel(provider.averageSurgeMultiplier)

                    return (
                      <div 
                        key={provider.provider}
                        className="rounded-xl border border-border p-3 bg-white"
                      >
                        {/* Provider Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg", theme.bg)}>
                              <ProviderLogo
                                theme={theme}
                                size={18}
                                className="h-4 w-4"
                                iconClassName={cn("h-4 w-4", theme.text)}
                              />
                            </div>
                            <span className="font-semibold text-sm text-warm-gray">{providerName}</span>
                          </div>
                          <span className="text-xs text-warm-gray/50">{provider.totalQuotes.toLocaleString()} quotes</span>
                        </div>
                        
                        {/* Market Share Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-warm-gray/60">Market Share</span>
                            <span className="font-mono font-medium text-warm-gray">{formatPercentage(marketShare, 0)}</span>
                          </div>
                          <div className="h-2 bg-cream rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", theme.accent)}
                              style={{ width: `${marketShare}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-cream/50 rounded-lg p-2">
                            <p className="text-[10px] text-warm-gray/50 mb-0.5">Surge Freq</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-[10px] px-1.5 py-0",
                                provider.surgePercentage >= 50 ? "text-red-600 border-red-200 bg-red-50" :
                                provider.surgePercentage >= 25 ? "text-amber-600 border-amber-200 bg-amber-50" :
                                "text-emerald-600 border-emerald-200 bg-emerald-50"
                              )}
                            >
                              {formatPercentage(provider.surgePercentage, 0)}
                            </Badge>
                          </div>
                          <div className="bg-cream/50 rounded-lg p-2">
                            <p className="text-[10px] text-warm-gray/50 mb-0.5">Avg Surge</p>
                            <span className={cn("font-mono text-xs font-bold px-1.5 py-0.5 rounded", getSurgeLevelColor(surgeLevel))}>
                              {formatSurgeMultiplier(provider.averageSurgeMultiplier)}
                            </span>
                          </div>
                          <div className="bg-cream/50 rounded-lg p-2">
                            <p className="text-[10px] text-warm-gray/50 mb-0.5">Max Surge</p>
                            <span className={cn(
                              "font-mono text-xs font-bold px-1.5 py-0.5 rounded",
                              getSurgeLevelColor(getSurgeLevel(provider.maxSurgeMultiplier))
                            )}>
                              {formatSurgeMultiplier(provider.maxSurgeMultiplier)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="rounded-xl border border-border overflow-hidden hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-cream hover:bg-cream">
                        <TableHead className="font-semibold text-warm-gray">Provider</TableHead>
                        <TableHead className="text-right font-semibold text-warm-gray">Total Quotes</TableHead>
                        <TableHead className="text-right font-semibold text-warm-gray">Market Share</TableHead>
                        <TableHead className="text-right font-semibold text-warm-gray">Surge Freq.</TableHead>
                        <TableHead className="text-right font-semibold text-warm-gray">Avg Surge</TableHead>
                        <TableHead className="text-right font-semibold text-warm-gray">Max Surge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surgeFrequencyByProvider.map((provider, index) => {
                        const theme = getProviderTheme(provider.provider)
                        const providerName = formatProviderName(provider.provider)
                        const marketShare = totalQuotes > 0 ? (provider.totalQuotes / totalQuotes) * 100 : 0
                        const surgeLevel = getSurgeLevel(provider.averageSurgeMultiplier)

                        return (
                          <TableRow 
                            key={provider.provider}
                            className={cn(index % 2 === 0 ? "bg-white" : "bg-cream/30")}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-lg", theme.bg)}>
                                  <ProviderLogo
                                    theme={theme}
                                    size={20}
                                    className="h-4 w-4"
                                    iconClassName={cn("h-4 w-4", theme.text)}
                                  />
                                </div>
                                <span className="font-semibold text-warm-gray">{providerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-warm-gray">
                              {provider.totalQuotes.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2.5 bg-cream rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all", theme.accent)}
                                    style={{ width: `${marketShare}%` }}
                                  />
                                </div>
                                <span className="font-mono text-sm w-12 text-warm-gray">
                                  {formatPercentage(marketShare, 0)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-mono",
                                  provider.surgePercentage >= 50 ? "text-red-600 border-red-200 bg-red-50" :
                                  provider.surgePercentage >= 25 ? "text-amber-600 border-amber-200 bg-amber-50" :
                                  "text-emerald-600 border-emerald-200 bg-emerald-50"
                                )}
                              >
                                {formatPercentage(provider.surgePercentage)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn("font-mono text-sm px-2 py-1 rounded-lg", getSurgeLevelColor(surgeLevel))}>
                                {formatSurgeMultiplier(provider.averageSurgeMultiplier)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "font-mono text-sm px-2 py-1 rounded-lg",
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
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </section>
      </Collapsible>

      {/* Top Routes Section */}
      <div className="animate-fade-in-up delay-300">
        <TopRoutesSection routes={topRoutes} isOpen={topRoutesOpen} onToggle={() => setTopRoutesOpen(!topRoutesOpen)} />
      </div>

      {/* Surge Patterns Section */}
      <Collapsible open={surgePatternsOpen} onOpenChange={setSurgePatternsOpen}>
        <section aria-labelledby="surge-patterns-title" className="animate-fade-in-up delay-400">
          <div className="mb-3 sm:mb-4">
            <CollapsibleSectionHeader
              icon={<div className="p-1.5 sm:p-2 rounded-lg bg-coral/10"><Zap className="h-4 w-4 sm:h-5 sm:w-5 text-coral" /></div>}
              title="Surge Patterns"
              titleId="surge-patterns-title"
              isOpen={surgePatternsOpen}
              onToggle={() => setSurgePatternsOpen(!surgePatternsOpen)}
            />
          </div>

          <CollapsibleContent>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* By Time of Day */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-coral/10">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
                    </div>
                    <CardTitle className="text-sm sm:text-base">By Time of Day</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    How surge pricing varies throughout the day
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                  {surgePatternsByTimeOfDay.map((slot) => (
                    <TimeSlotCard key={slot.timeSlot} slot={slot} />
                  ))}
                </CardContent>
              </Card>

              {/* By Location Type */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-teal/10">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal" />
                    </div>
                    <CardTitle className="text-sm sm:text-base">By Location Type</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Surge rates based on pickup area
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                  {surgePatternsByLocation.map((location) => (
                    <LocationCard key={location.locationType} location={location} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      {/* Key Insights Section */}
      {insights.length > 0 && (
        <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
          <section aria-labelledby="insights-title" className="animate-fade-in-up delay-500">
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                <CollapsibleTrigger
                  type="button"
                  onClick={() => setInsightsOpen(!insightsOpen)}
                  className="flex flex-col gap-1 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-coral/10">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
                    </div>
                    <CardTitle className="text-sm sm:text-lg group-hover:text-coral transition-colors" id="insights-title">
                      Key Insights
                    </CardTitle>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 text-warm-gray/50 transition-transform duration-200 shrink-0",
                        insightsOpen ? "rotate-0" : "-rotate-90"
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="px-3 sm:px-6">
                  <ul className="space-y-2 sm:space-y-3">
                    {insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/60 border border-white">
                        <div className={cn(
                          "mt-0.5 p-1 sm:p-1.5 rounded-full shrink-0",
                          insight.type === 'positive' ? 'bg-emerald-100' :
                          insight.type === 'negative' ? 'bg-red-100' : 'bg-teal/20'
                        )}>
                          {insight.type === 'positive' ? (
                            <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
                          ) : insight.type === 'negative' ? (
                            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600" />
                          ) : (
                            <Lightbulb className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal" />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-warm-gray font-medium">{insight.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </section>
        </Collapsible>
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
  const providerName = formatProviderName(provider.provider)
  const marketShare = totalQuotes > 0 ? (provider.totalQuotes / totalQuotes) * 100 : 0
  const surgeLevel = getSurgeLevel(provider.averageSurgeMultiplier)

  return (
    <Card className={cn(
      "relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full",
      isMarketLeader && "border-2 border-golden shadow-lg shadow-golden/10"
    )}>
      {/* Badge indicators */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1 sm:gap-1.5">
        {isMarketLeader && (
          <Badge className="bg-golden/10 text-golden hover:bg-golden/20 border-0 text-[9px] sm:text-[10px] px-1 sm:px-1.5">
            <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" aria-hidden="true" />
            Leader
          </Badge>
        )}
        {isBestValue && (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-[9px] sm:text-[10px] px-1 sm:px-1.5">
            <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" aria-hidden="true" />
            Low Surge
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl", theme.bg)}>
            <ProviderLogo
              theme={theme}
              size={28}
              className="h-5 w-5 sm:h-6 sm:w-6"
              iconClassName={cn("h-5 w-5 sm:h-6 sm:w-6", theme.text)}
            />
          </div>
          <CardTitle className="text-base sm:text-lg">{providerName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        {/* Market Share */}
        <div>
          <div className="flex justify-between text-xs sm:text-sm mb-1 sm:mb-1.5">
            <span className="text-warm-gray/60">Market Share</span>
            <span className="font-bold text-warm-gray">{formatPercentage(marketShare, 0)}</span>
          </div>
          <div className="h-2 sm:h-3 bg-cream rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", theme.accent)}
              style={{ width: `${marketShare}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-warm-gray/50 mt-1 sm:mt-1.5">
            {provider.totalQuotes.toLocaleString()} quotes
          </p>
        </div>

        {/* Surge Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-border">
          <div>
            <p className="text-[10px] sm:text-xs text-warm-gray/50 mb-0.5 sm:mb-1">Surge Freq.</p>
            <p className={cn(
              "stat-number text-xl sm:text-2xl",
              provider.surgePercentage >= 50 ? "text-red-600" :
              provider.surgePercentage >= 25 ? "text-amber-600" :
              "text-emerald-600"
            )}>
              {formatPercentage(provider.surgePercentage, 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-warm-gray/50 mb-0.5 sm:mb-1">Avg Multiplier</p>
            <p className={cn("stat-number text-xl sm:text-2xl", getSurgeLevelColor(surgeLevel).split(' ')[0])}>
              {formatSurgeMultiplier(provider.averageSurgeMultiplier)}
            </p>
          </div>
        </div>

        {/* Max Surge */}
        <div className="flex items-center justify-between text-xs sm:text-sm bg-cream rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3">
          <span className="text-warm-gray/60 flex items-center gap-1 sm:gap-1.5">
            <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" aria-hidden="true" />
            <span className="hidden xs:inline">Max Surge</span>
            <span className="xs:hidden">Max</span>
          </span>
          <Badge variant="outline" className={cn(
            "font-mono font-bold text-[10px] sm:text-xs",
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
        return <Sunrise className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
      case 'Late Night':
        return <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
      default:
        return <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-golden" />
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
    <div className="flex items-center justify-between p-2.5 sm:p-4 bg-cream/50 rounded-xl hover:bg-cream transition-colors border border-transparent hover:border-border gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm shrink-0" aria-hidden="true">
          {getTimeIcon(slot.timeSlot)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-warm-gray text-xs sm:text-sm truncate">{slot.timeSlot}</p>
          <p className="text-[10px] sm:text-xs text-warm-gray/50 truncate">{getTimeDescription(slot.timeSlot)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-white px-1.5 sm:px-2 py-0.5 hidden xs:inline-flex">
            {slot.tripCount} trips
          </Badge>
          <span className={cn(
            "text-xs sm:text-sm font-mono font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg",
            getSurgeLevelColor(surgeLevel)
          )}>
            {formatSurgeMultiplier(slot.averageSurgeMultiplier)}
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-warm-gray/50 mt-0.5 sm:mt-1">
          {formatPercentage(slot.surgePercentage)} surge
        </p>
      </div>
    </div>
  )
}

// Location Card Component
function LocationCard({ location }: { location: LocationInsight }) {
  const surgeLevel = getSurgeLevel(location.averageSurgeMultiplier)
  const locationName = location.locationType === 'CBD'
    ? 'CBD'
    : location.locationType

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'Airport':
        return <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal" />
      case 'CBD':
        return <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warm-gray" />
      default:
        return <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
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
    <div className="flex items-center justify-between p-2.5 sm:p-4 bg-cream/50 rounded-xl hover:bg-cream transition-colors border border-transparent hover:border-border gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm shrink-0" aria-hidden="true">
          {getLocationIcon(location.locationType)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-warm-gray text-xs sm:text-sm truncate">{locationName}</p>
          <p className="text-[10px] sm:text-xs text-warm-gray/50 truncate">{getLocationDescription(location.locationType)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-white px-1.5 sm:px-2 py-0.5 hidden xs:inline-flex">
            {location.tripCount} trips
          </Badge>
          <span className={cn(
            "text-xs sm:text-sm font-mono font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg",
            getSurgeLevelColor(surgeLevel)
          )}>
            {formatSurgeMultiplier(location.averageSurgeMultiplier)}
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-warm-gray/50 mt-0.5 sm:mt-1">
          {formatPercentage(location.surgePercentage)} surge
        </p>
      </div>
    </div>
  )
}

// Top Routes Section Component
interface TopRoutesSectionProps {
  routes: RouteAnalytics[]
  isOpen: boolean
  onToggle: () => void
}

function TopRoutesSection({ routes, isOpen, onToggle }: TopRoutesSectionProps) {
  if (!routes || routes.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <section aria-labelledby="top-routes-title">
          <div className="mb-3 sm:mb-4">
            <CollapsibleTrigger
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="p-1.5 sm:p-2 rounded-lg bg-coral/10">
                <Route className="h-4 w-4 sm:h-5 sm:w-5 text-coral" />
              </div>
              <div className="inline-flex items-center gap-1">
                <h2 id="top-routes-title" className="text-base sm:text-xl font-bold text-warm-gray group-hover:text-coral transition-colors">
                  Top Routes
                </h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5 text-warm-gray/50 transition-transform duration-200 shrink-0",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                  aria-hidden="true"
                />
              </div>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <Card>
              <CardContent className="py-8 sm:py-12 text-center px-3 sm:px-6">
                <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-cream w-fit">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-warm-gray/30" />
                </div>
                <p className="text-warm-gray/60 font-medium text-sm sm:text-base">No route data available yet</p>
                <p className="text-xs sm:text-sm text-warm-gray/40 mt-1">
                  Book some rides to see popular routes appear here
                </p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </section>
      </Collapsible>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <section aria-labelledby="top-routes-title">
        <div className="mb-3 sm:mb-4">
            <CollapsibleTrigger
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="p-1.5 sm:p-2 rounded-lg bg-coral/10">
                <Route className="h-4 w-4 sm:h-5 sm:w-5 text-coral" />
            </div>
            <div className="inline-flex items-center gap-1">
              <h2 id="top-routes-title" className="text-base sm:text-xl font-bold text-warm-gray group-hover:text-coral transition-colors">
                Top Routes
              </h2>
              <ChevronDown
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 text-warm-gray/50 transition-transform duration-200 shrink-0",
                  isOpen ? "rotate-0" : "-rotate-90"
                )}
                aria-hidden="true"
              />
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="space-y-2 sm:space-y-3 pt-4 sm:pt-6 px-3 sm:px-6">
              {routes.map((route, index) => (
                <RouteCard key={`${route.origin}-${route.destination}`} route={route} rank={index + 1} />
              ))}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

// Route Card Component
function RouteCard({ route, rank }: { route: RouteAnalytics; rank: number }) {
  const theme = getProviderTheme(route.mostPopularProvider)
  const isTopRoute = rank === 1

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2.5 sm:p-4 rounded-xl transition-all gap-2 sm:gap-4",
        isTopRoute
          ? "bg-gradient-to-r from-golden-light to-coral-light border-2 border-golden/30"
          : "bg-cream/50 hover:bg-cream border border-transparent hover:border-border"
      )}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Rank Badge */}
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shrink-0",
            isTopRoute
              ? "bg-golden text-white shadow-md shadow-golden/30"
              : rank <= 3
                ? "bg-warm-gray/10 text-warm-gray"
                : "bg-cream text-warm-gray/50"
          )}
        >
          {isTopRoute ? <Trophy className="h-3 w-3 sm:h-4 sm:w-4" /> : rank}
        </div>

        {/* Route Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm text-warm-gray truncate max-w-[80px] sm:max-w-[180px]" title={route.origin}>
              {route.origin}
            </span>
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-coral shrink-0" aria-hidden="true" />
            <span className="font-semibold text-xs sm:text-sm text-warm-gray truncate max-w-[80px] sm:max-w-[180px]" title={route.destination}>
              {route.destination}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 mt-1 sm:mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-white px-1 sm:px-2 py-0">
              {route.tripCount} trips
            </Badge>
            <span className="text-[10px] sm:text-xs text-warm-gray/50">
              {formatCurrency(route.avgFare)}
            </span>
            {route.avgDistance > 0 && (
              <span className="text-[10px] sm:text-xs text-warm-gray/50 hidden xs:inline">
                {route.avgDistance} km
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Most Popular Provider */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className={cn("p-1 sm:p-1.5 rounded-lg", theme.bg)}>
          <ProviderLogo
            theme={theme}
            size={18}
            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
            iconClassName={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", theme.text)}
          />
        </div>
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
      text: `${formatProviderName(marketLeader.provider)} leads the market with ${share}% of all quotes`,
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
        text: `${formatProviderName(bestValue.provider)} has ${diff}% less surge frequency than ${formatProviderName(worstSurge.provider)}`,
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
