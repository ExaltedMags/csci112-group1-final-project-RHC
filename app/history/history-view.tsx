"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Car, Bike, BarChart3, PiggyBank } from "lucide-react"

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Trip History</h1>
        
        {/* Referrals Badge/List */}
        {referrals.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
               <span className="text-sm text-muted-foreground">Referral clicks:</span>
               {referrals.map(r => (
                  <Badge key={r.providerCode} variant="secondary" className="text-xs">
                     {r.providerCode} {r.count}
                  </Badge>
               ))}
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime rides
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorite Provider</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProvider ? topProvider._id : "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {topProvider ? `${topProvider.count} rides` : "No data"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fare (Booked)</CardTitle>
            <div className="font-bold text-muted-foreground">₱</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {/* Simple average of averages for demo, or weighted */}
               ₱{analytics.length > 0 ? Math.round(analytics.reduce((acc, c) => acc + c.avgFare, 0) / analytics.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated average
            </p>
          </CardContent>
        </Card>
        
        {/* New Savings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Opportunity</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{savings.totalOverpay}</div>
            <p className="text-xs text-muted-foreground">
              Potential savings
            </p>
             <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                Avg extra per trip: ₱{savings.avgOverpayPerTrip}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No trips found</TableCell>
                </TableRow>
              ) : (
                history.map((trip) => (
                  <TableRow key={trip._id}>
                    <TableCell className="font-medium">
                      {formatDistanceToNow(new Date(trip.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[200px] sm:max-w-none">
                        <span className="truncate font-medium">{trip.destination}</span>
                        <span className="truncate text-xs text-muted-foreground">from {trip.origin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {trip.selectedQuote ? (
                        <div className="flex items-center">
                           {trip.selectedQuote.category === '4-wheel' ? <Car className="w-3 h-3 mr-1" /> : <Bike className="w-3 h-3 mr-1" />}
                           {trip.selectedQuote.provider}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {trip.selectedQuote ? `₱${trip.selectedQuote.minFare}` : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={trip.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'BOOKED') return <Badge variant="default">Booked</Badge>
  if (status === 'COMPLETED') return <Badge variant="secondary">Completed</Badge>
  return <Badge variant="outline">Searched</Badge>
}
