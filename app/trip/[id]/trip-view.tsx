"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ITrip, IQuote } from "@/models/Trip"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, Car, Bike, Sparkles, MapPin, ArrowRight, Zap, Crown, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { getProviderTheme } from "@/lib/provider-theme"
import { ProviderLogo } from "@/components/provider-logo"

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

  // Sort quotes by minFare to show cheapest first
  const sortedQuotes = [...trip.quotes].sort((a, b) => a.minFare - b.minFare)
  const cheapestFare = sortedQuotes[0]?.minFare || 0

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-4 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 text-teal text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{trip.quotes.length} rides found</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-warm-gray">
          Choose Your Ride
        </h1>
        
        {/* Route Summary */}
        <div className="flex items-center justify-center gap-3 text-warm-gray/70">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal" />
            <span className="text-sm font-medium max-w-[150px] truncate">{trip.origin}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-coral" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-coral" />
            <span className="text-sm font-medium max-w-[150px] truncate">{trip.destination}</span>
          </div>
        </div>
        
        <Badge variant="outline" className="text-sm py-1.5 px-4 bg-cream border-border">
          <MapPin className="w-3.5 h-3.5 mr-1.5" />
          {trip.distanceKm} km
        </Badge>
      </div>

      {/* Quote Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {sortedQuotes.map((quote, index) => (
          <div 
            key={quote.provider} 
            className={cn(
              "animate-fade-in-up",
              index === 0 && "delay-100",
              index === 1 && "delay-200",
              index === 2 && "delay-300"
            )}
          >
            <QuoteCard 
              quote={quote} 
              onSelect={() => handleSelect(quote.provider)}
              isLoading={loadingProvider === quote.provider}
              isBestPrice={quote.minFare === cheapestFare}
              formatCurrency={formatCurrency}
              rank={index + 1}
            />
          </div>
        ))}
      </div>

      {/* Tip Section */}
      <div className="bg-gradient-to-r from-golden-light to-coral-light rounded-2xl p-5 border border-golden/20 animate-fade-in-up delay-400">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-golden/20">
            <Zap className="w-5 h-5 text-golden" />
          </div>
          <div>
            <h3 className="font-bold text-warm-gray">Pro Tip</h3>
            <p className="text-sm text-warm-gray/70 mt-1">
              Surge pricing usually drops after 15-20 minutes. If all fares seem high, try checking again later!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteCard({ 
  quote, 
  onSelect, 
  isLoading, 
  isBestPrice,
  formatCurrency,
  rank
}: { 
  quote: IQuote, 
  onSelect: () => void, 
  isLoading: boolean,
  isBestPrice: boolean,
  formatCurrency: (val: number) => string,
  rank: number
}) {
  const theme = getProviderTheme(quote.provider)

  return (
    <Card className={cn(
      "flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group h-full min-h-[400px]",
      isBestPrice && "border-2 border-coral shadow-lg shadow-coral/10 bg-gradient-to-br from-white to-coral-light"
    )}>
      {/* Best Price Badge */}
      {isBestPrice && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-coral text-white text-xs px-3 py-1.5 font-bold flex items-center justify-center gap-1.5 z-10">
          <Crown className="w-3.5 h-3.5" />
          Best Price
        </div>
      )}
      
      <CardHeader className={cn("pb-3", isBestPrice && "pt-10")}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
              theme.bg
            )}>
              <ProviderLogo
                theme={theme}
                size={32}
                className="w-6 h-6"
                iconClassName={cn("w-6 h-6", theme.text)}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{PROVIDER_LABELS[quote.provider] || quote.provider}</CardTitle>
              <CardDescription className="flex items-center mt-0.5">
                {quote.category === '4-wheel' ? (
                  <>
                    <Car className="w-3.5 h-3.5 mr-1" />
                    4-Wheel
                  </>
                ) : (
                  <>
                    <Bike className="w-3.5 h-3.5 mr-1" />
                    Motorcycle
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          {quote.isSurge && (
            <Badge 
              variant="destructive" 
              className="flex items-center gap-1 animate-pulse"
            >
              <Zap className="w-3 h-3" />
              {quote.surgeMultiplier}x
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 py-4">
        {/* Price Display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-4xl font-extrabold tracking-tight",
              isBestPrice ? "text-coral" : "text-warm-gray"
            )}>
              {formatCurrency(quote.minFare)}
            </span>
            {quote.maxFare !== quote.minFare && (
              <span className="text-warm-gray/50 text-sm font-medium">
                — {formatCurrency(quote.maxFare)}
              </span>
            )}
          </div>
          {isBestPrice && (
            <p className="text-xs text-coral font-medium mt-1">
              Lowest fare available
            </p>
          )}
        </div>
        
        {/* ETA */}
        <div className="flex items-center gap-2 text-sm text-warm-gray/70 bg-cream rounded-lg p-2.5">
          <Clock className="w-4 h-4 text-teal" />
          <span>Pickup in <strong className="text-warm-gray">~{quote.eta} mins</strong></span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 pb-5">
        <Button 
          className={cn(
            "w-full h-12 font-bold transition-all",
            isBestPrice 
              ? "shadow-lg shadow-coral/25" 
              : "bg-warm-gray hover:bg-warm-gray/90 shadow-warm-gray/20"
          )}
          onClick={onSelect} 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Select {PROVIDER_LABELS[quote.provider]?.split(' ')[0] || quote.provider}
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
