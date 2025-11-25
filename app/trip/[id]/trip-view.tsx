"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ITrip, IQuote } from "@/models/Trip"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, Car, Bike } from "lucide-react"
import { cn } from "@/lib/utils"

interface TripViewProps {
  trip: ITrip;
}

export default function TripView({ trip }: TripViewProps) {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleSelect = async (provider: string) => {
    // Get userId from localStorage
    const stored = localStorage.getItem("ph-ride-user")
    if (!stored) {
      console.error("User not authenticated")
      return
    }

    const user = JSON.parse(stored)
    setLoadingProvider(provider)
    try {
      const res = await fetch(`/api/trips/${trip._id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider,
          userId: user.userId // Include userId in request
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Selection failed')
      }
      
      router.push(`/handoff/${provider}/${trip._id}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      setLoadingProvider(null)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Ride</h1>
        <p className="text-muted-foreground">
          {trip.origin} <span className="mx-2">→</span> {trip.destination}
        </p>
        <Badge variant="outline" className="text-sm py-1">
          {trip.distanceKm} km
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {trip.quotes.map((quote) => (
          <QuoteCard 
            key={quote.provider} 
            quote={quote} 
            onSelect={() => handleSelect(quote.provider)}
            isLoading={loadingProvider === quote.provider}
            isBestPrice={quote.minFare === Math.min(...trip.quotes.map(q => q.minFare))}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    </div>
  )
}

function QuoteCard({ 
  quote, 
  onSelect, 
  isLoading, 
  isBestPrice,
  formatCurrency
}: { 
  quote: IQuote, 
  onSelect: () => void, 
  isLoading: boolean,
  isBestPrice: boolean,
  formatCurrency: (val: number) => string
}) {
  return (
    <Card className={cn("flex flex-col relative overflow-hidden transition-all hover:shadow-md", isBestPrice && "border-primary/50 shadow-sm")}>
      {isBestPrice && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-md font-medium">
          Best Price
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{PROVIDER_LABELS[quote.provider] || quote.provider}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              {quote.category === '4-wheel' ? <Car className="w-4 h-4 mr-1" /> : <Bike className="w-4 h-4 mr-1" />}
              {quote.category}
            </CardDescription>
          </div>
          {quote.isSurge && (
            <Badge variant="destructive" className="ml-2">Surge x{quote.surgeMultiplier}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-4">
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-3xl font-bold">
            {formatCurrency(quote.minFare)}
          </span>
          <span className="text-muted-foreground text-sm">
            - {formatCurrency(quote.maxFare)}
          </span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2" />
          <span>~{quote.eta} mins ETA</span>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button className="w-full" onClick={onSelect} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select This Ride"}
        </Button>
      </CardFooter>
    </Card>
  )
}

