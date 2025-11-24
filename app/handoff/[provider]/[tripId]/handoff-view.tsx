"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ITrip } from "@/models/Trip"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import dynamic from "next/dynamic"
const RideMap = dynamic(() => import("@/components/ride-map").then((mod) => mod.RideMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] w-full items-center justify-center rounded-none bg-gray-50 text-sm text-gray-400">
      Loading map...
    </div>
  ),
})
import { 
  ArrowLeft, 
  Car, 
  Bike, 
  Globe, 
  CreditCard, 
  Tag, 
  FileText, 
  Navigation2, 
  MoreHorizontal,
  ShieldCheck
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface HandoffViewProps {
  trip: ITrip & { _id: string }
  providerId: string
  orsEnabled: boolean
}

// Theme configuration
const PROVIDER_THEME: Record<string, { 
  accent: string, 
  hover: string,
  text: string,
  bg: string,
  mapColor: string,
  icon: LucideIcon 
}> = {
  GrabPH: { 
    accent: "bg-green-600", 
    hover: "hover:bg-green-700",
    text: "text-green-600",
    bg: "bg-green-50",
    mapColor: "#16a34a",
    icon: Car 
  },
  JoyRideMC: { 
    accent: "bg-indigo-600", 
    hover: "hover:bg-indigo-700",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    mapColor: "#4f46e5",
    icon: Bike 
  },
  Angkas: { 
    accent: "bg-cyan-600", 
    hover: "hover:bg-cyan-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
    mapColor: "#0891b2",
    icon: Bike 
  },
  // Fallback
  default: { 
    accent: "bg-slate-900", 
    hover: "hover:bg-slate-800",
    text: "text-slate-900",
    bg: "bg-slate-50",
    mapColor: "#0f172a",
    icon: Car 
  }
}

export default function HandoffView({ trip, providerId, orsEnabled }: HandoffViewProps) {
  const router = useRouter()
  const [isBooking, setIsBooking] = useState(false)
  const isDev = process.env.NODE_ENV !== "production"
  const missingRouteGeometry = !(trip.routeGeometry?.coordinates?.length ?? 0)
  const usedMapboxFallback = trip.routeSource === "MAPBOX"
  const noticeMessage = !isDev
    ? null
    : !orsEnabled
      ? "ORS is disabled in this environment. Enable ORS_API_KEY to render the live route."
      : missingRouteGeometry
        ? "This trip is missing route geometry. Check the search API logs to confirm routing."
        : usedMapboxFallback
          ? "Using Mapbox Directions fallback for this route (dev-only notice)."
          : null
  const showRouteNotice = Boolean(noticeMessage)
  
  // Find relevant quote
  const quote = trip.quotes.find(q => q.provider === providerId) || 
                trip.selectedQuote || 
                trip.quotes[0]

  const theme = PROVIDER_THEME[providerId] || PROVIDER_THEME.default
  const ProviderIcon = theme.icon

  const handleBook = () => {
    setIsBooking(true)
    
    // Simulate processing
    setTimeout(() => {
      // Navigate to history
      router.push('/history')
      router.refresh()
    }, 1500)
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(val)

  const averageFare = Math.round((quote.minFare + quote.maxFare) / 2)

  useEffect(() => {
    if (!isDev) {
      return
    }

    if (!orsEnabled) {
      console.warn("[handoff] ORS is disabled (missing API key); route lines unavailable.")
    }

    if (missingRouteGeometry) {
      console.warn("[handoff] Trip is missing route geometry; showing markers only.", {
        tripId: trip._id,
        hasOriginLocation: Boolean(trip.originLocation),
        hasDestinationLocation: Boolean(trip.destinationLocation),
      })
    }

    if (usedMapboxFallback) {
      console.warn("[handoff] Mapbox Directions fallback was used for this trip.", {
        tripId: trip._id,
      })
    }
  }, [isDev, missingRouteGeometry, orsEnabled, usedMapboxFallback, trip._id, trip.destinationLocation, trip.originLocation])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto border-x shadow-xl relative overflow-hidden">
      
      {/* 1. TOP NAVIGATION BAR */}
      <div className="fixed top-0 w-full max-w-md z-50 bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Button>
        
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg text-gray-800">
            {PROVIDER_LABELS[providerId]?.split('(')[0].trim() || providerId}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            Simulated App
          </Badge>
        </div>
        
        <Button variant="ghost" size="icon" className="rounded-full">
          <Globe className="w-5 h-5 text-gray-500" />
        </Button>
      </div>

      {/* 2. DIAGNOSTIC BANNER */}
      {showRouteNotice && noticeMessage && (
        <div className="px-4 mt-20">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {noticeMessage}
          </div>
        </div>
      )}

      {/* 3. MAP SECTION */}
      <div className="px-4">
        <RideMap
          origin={trip.originLocation}
          destination={trip.destinationLocation}
          path={trip.routeGeometry?.coordinates ?? null}
          accentColor={theme.mapColor}
          className="h-[340px] w-full rounded-none"
        />
      </div>

      {/* 4. ROUTE SUMMARY CARD */}
      <div className="px-4 mt-4">
        <Card className="shadow-lg border-0">
          <div className="p-4 space-y-4">
            {/* Route Details */}
            <div className="flex flex-col gap-3">
              {/* Pickup */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1 h-full pt-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                  <div className="w-0.5 h-8 bg-gray-200 grow"></div>
                </div>
                <div className="flex-1 border-b border-gray-100 pb-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pick-up</p>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{trip.origin}</p>
                </div>
              </div>

              {/* Drop-off */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1 h-full pb-1">
                  <div className={cn("w-3 h-3 rounded-full ring-4 ring-opacity-30", theme.accent, theme.text.replace('text-', 'ring-'))}></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Drop-off</p>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{trip.destination}</p>
                </div>
              </div>
            </div>

            <Separator />
            
            {/* Distance & ETA */}
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Navigation2 className="w-4 h-4" />
                <span>{trip.distanceKm} km</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">~{quote.eta} mins</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. VEHICLE / SERVICE OPTIONS */}
      <div className="px-4 mt-4">
        <div className={cn("rounded-xl border-2 p-3 flex items-center justify-between bg-white shadow-sm transition-colors", `border-${providerId === 'GrabPH' ? 'green' : providerId === 'Angkas' ? 'cyan' : 'indigo'}-100`)}>
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", theme.bg)}>
              <ProviderIcon className={cn("w-6 h-6", theme.text)} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                {quote.category === '4-wheel' ? 'Standard Car' : 'MC Taxi'}
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {quote.category === '4-wheel' ? '4 seats' : '1 seat'}
                </Badge>
              </h3>
              <p className="text-xs text-gray-500">
                {quote.category === '4-wheel' ? 'Widest range of cars' : 'Beat the traffic'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrency(averageFare)}</p>
            {quote.isSurge && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Surge</Badge>
            )}
          </div>
        </div>
        
        {/* Marketing Banner / Upsell */}
        <div className="mt-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 flex items-center gap-3 border border-orange-100">
          <div className="bg-white p-1.5 rounded-full shadow-sm">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-800">Ride Cover</p>
            <p className="text-[10px] text-gray-600">Get protected on this ride for ₱5.00</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-orange-700 hover:bg-orange-100 hover:text-orange-800">
            Add
          </Button>
        </div>
      </div>

      {/* 6. PAYMENT & PROMO STRIP */}
      <div className="px-4 mt-4 mb-24">
        <div className="flex items-center justify-between bg-white py-3 border-t border-b border-gray-100">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <div className="bg-gray-100 p-1.5 rounded-full">
              <CreditCard className="w-4 h-4 text-gray-600" />
            </div>
            Cash
          </button>
          
          <div className="w-px h-6 bg-gray-200"></div>
          
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <Tag className="w-4 h-4 text-gray-500" />
            Promo
          </button>
          
          <div className="w-px h-6 bg-gray-200"></div>
          
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <FileText className="w-4 h-4 text-gray-500" />
            Notes
          </button>
        </div>
      </div>

      {/* 7. BOOK BUTTON BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 max-w-md mx-auto">
        {/* Simulated Toast Message */}
        {isBooking && (
           <div className="absolute bottom-20 left-4 right-4 bg-black/80 text-white text-sm py-2 px-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 text-center z-50">
            In a real app, this would open the provider&apos;s app...
          </div>
        )}

        <div className="flex items-center justify-between mb-3 px-1">
           <div className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold", theme.accent)}>
                G
              </div>
              <span className="text-xs font-medium text-gray-500">Points +12</span>
           </div>
           <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </div>

        <Button 
          className={cn("w-full h-14 text-lg font-bold shadow-md transition-all active:scale-[0.98]", theme.accent, theme.hover)}
          onClick={handleBook}
          disabled={isBooking}
        >
          {isBooking ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Booking...
            </span>
          ) : (
            `Book ${PROVIDER_LABELS[providerId]?.split('(')[0] || providerId}`
          )}
        </Button>
      </div>
    </div>
  )
}

