"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Car, Bike, BarChart3, PiggyBank, ExternalLink, TrendingUp, MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { getProviderTheme } from "@/lib/provider-theme"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { ProviderLogo } from "@/components/provider-logo"

// Serialized trip type (plain object for client-side, not Mongoose document)
interface SerializedTrip {
  _id: string
  origin: string
  destination: string
  distanceKm: number
  durationMinutes: number
  originLocation?: {
    label: string
    lat: number
    lng: number
  }
  destinationLocation?: {
    label: string
    lat: number
    lng: number
  }
  routeGeometry?: {
    coordinates: { lat: number; lng: number }[]
  }
  routeSource?: 'ORS' | 'MAPBOX'
  status: 'SEARCHED' | 'BOOKED' | 'COMPLETED'
  quotes: {
    provider: string
    fare?: number
    minFare: number
    maxFare: number
    eta: number
    surgeMultiplier: number
    isSurge: boolean
    category: '4-wheel' | '2-wheel'
  }[]
  selectedQuote?: {
    provider: string
    fare?: number
    minFare: number
    maxFare: number
    eta: number
    surgeMultiplier: number
    isSurge: boolean
    category: '4-wheel' | '2-wheel'
  }
  userId: string
  createdAt: string
}

interface HistoryViewProps {
  history: SerializedTrip[];
  analytics: {
    _id: string; // Provider name
    count: number;
    avgFare: number;
  }[];
  savings: {
    totalOverpay: number;
    avgOverpayPerTrip: number;
  };
  referrals: {
    providerCode: string;
    count: number;
  }[];
}

export default function HistoryView({ history, analytics, savings, referrals }: HistoryViewProps) {
  const totalTrips = analytics.reduce((acc, curr) => acc + curr.count, 0)
  const topProvider = analytics.sort((a, b) => b.count - a.count)[0]

  // Calculate total referral clicks
  const totalReferrals = referrals.reduce((acc, r) => acc + r.count, 0)
  const topReferralProvider = referrals.sort((a, b) => b.count - a.count)[0]

  const formatProviderName = (providerId: string) => PROVIDER_LABELS[providerId] ?? providerId

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-warm-gray">
          Your Trip History
        </h1>
        <p className="text-warm-gray/60">
          Track your rides and discover savings opportunities
        </p>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Trips */}
        <Card className="animate-fade-in-up delay-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-gray/70">Total Trips</CardTitle>
            <div className="p-2 rounded-lg bg-coral/10">
              <BarChart3 className="h-4 w-4 text-coral" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-3xl text-coral">{totalTrips}</div>
            <p className="text-xs text-warm-gray/50 mt-1">
              Lifetime rides compared
            </p>
          </CardContent>
        </Card>

        {/* Favorite Provider */}
        <Card className="animate-fade-in-up delay-150 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-gray/70">Favorite Provider</CardTitle>
            <div className="p-2 rounded-lg bg-teal/10">
              <Car className="h-4 w-4 text-teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-3xl text-warm-gray">
              {topProvider ? topProvider._id : "N/A"}
            </div>
            <p className="text-xs text-warm-gray/50 mt-1">
              {topProvider ? `${topProvider.count} rides booked` : "No data yet"}
            </p>
          </CardContent>
        </Card>

        {/* Average Fare */}
        <Card className="animate-fade-in-up delay-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-gray/70">Avg Fare</CardTitle>
            <div className="p-2 rounded-lg bg-golden/10">
              <TrendingUp className="h-4 w-4 text-golden" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-3xl text-warm-gray">
               ₱{analytics.length > 0 ? Math.round(analytics.reduce((acc, c) => acc + c.avgFare, 0) / analytics.length) : 0}
            </div>
            <p className="text-xs text-warm-gray/50 mt-1">
              Per booked trip
            </p>
          </CardContent>
        </Card>
        
        {/* Savings Card */}
        <Card className="animate-fade-in-up delay-250 hover:shadow-lg transition-shadow bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Savings Found</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <PiggyBank className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-3xl text-emerald-600">₱{savings.totalOverpay}</div>
            <p className="text-xs text-emerald-600/70 mt-1">
              By comparing fares
            </p>
             <div className="mt-2 text-xs text-emerald-600/60 border-t border-emerald-200/50 pt-2">
                ~₱{savings.avgOverpayPerTrip} saved per trip
            </div>
          </CardContent>
        </Card>

        {/* Referral Clicks Card */}
        <Card className="animate-fade-in-up delay-300 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-gray/70">Handoffs</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <ExternalLink className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-3xl text-warm-gray">{totalReferrals}</div>
            <p className="text-xs text-warm-gray/50 mt-1">
              {topReferralProvider ? `Top: ${formatProviderName(topReferralProvider.providerCode)}` : "No handoffs yet"}
            </p>
            {referrals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                {referrals.map(r => {
                  const theme = getProviderTheme(r.providerCode)
                  return (
                    <Badge 
                      key={r.providerCode} 
                      variant="outline" 
                      className={cn("text-[10px] px-1.5 py-0.5", theme.text, theme.bg)}
                    >
                      {formatProviderName(r.providerCode)} {r.count}
                    </Badge>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips Table */}
      <Card className="animate-fade-in-up delay-400">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-coral/10">
              <Clock className="h-5 w-5 text-coral" />
            </div>
            <div>
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <p className="text-sm text-warm-gray/60 mt-0.5">Your latest trip searches and bookings</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-cream hover:bg-cream">
                  <TableHead className="font-semibold text-warm-gray">Date</TableHead>
                  <TableHead className="font-semibold text-warm-gray">Route</TableHead>
                  <TableHead className="font-semibold text-warm-gray">Provider</TableHead>
                  <TableHead className="font-semibold text-warm-gray">Fare</TableHead>
                  <TableHead className="font-semibold text-warm-gray">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-cream">
                          <MapPin className="h-8 w-8 text-warm-gray/30" />
                        </div>
                        <p className="text-warm-gray/60 font-medium">No trips yet</p>
                        <p className="text-sm text-warm-gray/40">Start comparing fares to see your history here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((trip, index) => {
                    const theme = trip.selectedQuote ? getProviderTheme(trip.selectedQuote.provider) : null
                    
                    return (
                      <TableRow 
                        key={trip._id}
                        className={cn(
                          "transition-colors",
                          index % 2 === 0 ? "bg-white" : "bg-cream/30"
                        )}
                      >
                        <TableCell className="font-medium text-warm-gray/70">
                          {formatDistanceToNow(new Date(trip.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[200px] sm:max-w-none">
                            <span className="truncate font-semibold text-warm-gray">{trip.destination}</span>
                            <span className="truncate text-xs text-warm-gray/50">from {trip.origin}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trip.selectedQuote ? (
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-lg", theme?.bg ?? "bg-cream")}>
                                {theme ? (
                                  <ProviderLogo
                                    theme={theme}
                                    size={20}
                                    className="w-3.5 h-3.5"
                                    iconClassName={cn("w-3.5 h-3.5", theme.text)}
                                  />
                                ) : (
                                  <Car className="w-3.5 h-3.5 text-warm-gray/40" />
                                )}
                              </div>
                              <span className="font-medium text-warm-gray">{formatProviderName(trip.selectedQuote.provider)}</span>
                            </div>
                          ) : (
                            <span className="text-warm-gray/40">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {trip.selectedQuote ? (
                            <span className="font-bold text-warm-gray">₱{trip.selectedQuote.minFare}</span>
                          ) : (
                            <span className="text-warm-gray/40">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={trip.status} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'BOOKED') {
    return (
      <Badge className="bg-coral/10 text-coral hover:bg-coral/20 border-0">
        Booked
      </Badge>
    )
  }
  if (status === 'COMPLETED') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
        Completed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-warm-gray/60 bg-cream">
      Searched
    </Badge>
  )
}
