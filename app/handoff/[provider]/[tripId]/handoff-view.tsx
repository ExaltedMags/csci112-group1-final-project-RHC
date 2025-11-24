"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ITrip } from "@/models/Trip"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  MapPin, 
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
}

// Theme configuration
const PROVIDER_THEME: Record<string, { 
  accent: string, 
  hover: string,
  text: string,
  bg: string,
  icon: LucideIcon 
}> = {
  GrabPH: { 
    accent: "bg-green-600", 
    hover: "hover:bg-green-700",
    text: "text-green-600",
    bg: "bg-green-50",
    icon: Car 
  },
  JoyRideMC: { 
    accent: "bg-indigo-600", 
    hover: "hover:bg-indigo-700",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: Bike 
  },
  Angkas: { 
    accent: "bg-cyan-600", 
    hover: "hover:bg-cyan-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
    icon: Bike 
  },
  // Fallback
  default: { 
    accent: "bg-slate-900", 
    hover: "hover:bg-slate-800",
    text: "text-slate-900",
    bg: "bg-slate-50",
    icon: Car 
  }
}

export default function HandoffView({ trip, providerId }: HandoffViewProps) {
  const router = useRouter()
  const [isBooking, setIsBooking] = useState(false)
  
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

      {/* Spacer for fixed header */}
      <div className="h-16"></div>

      {/* 2. MAP SECTION (STATIC MOCK) */}
      <div className="relative w-full h-64 bg-gray-200 overflow-hidden group">
        {/* Map placeholder pattern */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Fake roads */}
        <div className="absolute top-0 left-1/4 w-4 h-full bg-white rotate-12 transform translate-x-8"></div>
        <div className="absolute top-1/3 left-0 w-full h-4 bg-white -rotate-6"></div>
        <div className="absolute bottom-1/4 right-0 w-full h-6 bg-white rotate-3"></div>

        {/* Route Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path 
            d="M 80 80 Q 150 150 300 200" 
            fill="none" 
            stroke={theme.accent.replace('bg-', 'var(--tw-color-)')} 
            className={cn("stroke-[4px]", theme.text)}
            strokeLinecap="round"
            strokeDasharray="8 4"
          />
        </svg>

        {/* Pins */}
        <div className="absolute top-[60px] left-[65px] flex flex-col items-center animate-bounce duration-1000">
          <div className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg z-10">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="w-1 h-8 bg-black/20"></div>
        </div>

        <div className="absolute top-[180px] left-[285px] flex flex-col items-center">
          <div className={cn("text-white p-2 rounded-full shadow-lg z-10", theme.accent)}>
             <MapPin className="w-5 h-5 fill-current" />
          </div>
        </div>
      </div>

      {/* 3. ROUTE SUMMARY CARD */}
      <div className="px-4 -mt-6 relative z-10">
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

      {/* 4. VEHICLE / SERVICE OPTIONS */}
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

      {/* 5. PAYMENT & PROMO STRIP */}
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

      {/* 6. BOOK BUTTON BAR */}
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

