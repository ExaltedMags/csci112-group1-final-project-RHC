"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useRef, useCallback, type FormEvent, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Navigation, ArrowUpDown, History, Sparkles, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import LocationSearchInput from "@/components/location-search-input"
import type { PlaceSuggestion } from "@/lib/mapbox"
import { AuthGuard } from "@/components/auth-guard"

interface HistoryEntry {
  originName: string;
  destinationName: string;
  requestedAt: string;
}

const POPULAR_LOCATIONS = [
  "Ateneo de Manila University",
  "UP Diliman",
  "Bonifacio High Street",
  "SM Megamall",
  "NAIA Terminal 3",
]

export default function SearchPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [recentPlaces, setRecentPlaces] = useState<string[]>([])
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('origin')
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(null)
  const [destinationPlace, setDestinationPlace] = useState<PlaceSuggestion | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputsContainerRef = useRef<HTMLDivElement | null>(null)
  const originIconRef = useRef<HTMLDivElement | null>(null)
  const destinationIconRef = useRef<HTMLDivElement | null>(null)
  const [connectorStyle, setConnectorStyle] = useState<{ top: number; height: number; left: number } | null>(null)

  const updateConnectorPosition = useCallback(() => {
    if (
      !inputsContainerRef.current ||
      !originIconRef.current ||
      !destinationIconRef.current
    ) {
      return
    }

    const containerRect = inputsContainerRef.current.getBoundingClientRect()
    const originRect = originIconRef.current.getBoundingClientRect()
    const destinationRect = destinationIconRef.current.getBoundingClientRect()

    const originCenterY = originRect.top + originRect.height / 2 - containerRect.top
    const destinationCenterY =
      destinationRect.top + destinationRect.height / 2 - containerRect.top
    const lineWidth = 2 // Tailwind w-0.5 = 0.125rem ≈ 2px
    const left =
      originRect.left + originRect.width / 2 - containerRect.left - lineWidth / 2

    setConnectorStyle({
      top: originCenterY,
      height: Math.max(destinationCenterY - originCenterY, 0),
      left,
    })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updateConnectorPosition)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [updateConnectorPosition, originPlace?.label, destinationPlace?.label, activeField])

  // Fetch history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        // Get userId from localStorage
        const stored = localStorage.getItem("ph-ride-user")
        if (!stored) return

        const user = JSON.parse(stored)
        const res = await fetch(`/api/users/${user.userId}/history`)
        if (res.ok) {
          const data = await res.json()
          // Extract unique locations from history
          const locations = new Set<string>()
          if (data.history && Array.isArray(data.history)) {
            data.history.forEach((entry: HistoryEntry) => {
              if (entry.destinationName) locations.add(entry.destinationName)
              if (entry.originName) locations.add(entry.originName)
            })
          }
          // Take top 6 unique recent places
          setRecentPlaces(Array.from(locations).slice(0, 6))
        }
      } catch (error) {
        console.error("Failed to fetch history", error)
      }
    }
    fetchHistory()
  }, [])

  const fetchPlaceByLabel = async (label: string): Promise<PlaceSuggestion | null> => {
    try {
      const params = new URLSearchParams({ search: label })
      const res = await fetch(`/api/places/search?${params.toString()}`)
      if (!res.ok) return null
      const data: PlaceSuggestion[] = await res.json()
      return data[0] ?? null
    } catch (error) {
      console.error("Failed to resolve place label:", error)
      return null
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!originPlace || !destinationPlace) return

    // Get userId from localStorage
    const stored = localStorage.getItem("ph-ride-user")
    if (!stored) {
      setErrorMessage("Please sign in to search for trips")
      return
    }

    const user = JSON.parse(stored)
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/trips/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originPlace,
          destinationPlace,
          origin: originPlace.label,
          destination: destinationPlace.label,
          userId: user.userId, // Include userId in request
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search trips')
      }

      const data = await response.json()
      router.push(`/trip/${data.tripId}`)
    } catch (error) {
      console.error(error)
      setErrorMessage("We couldn't fetch routes right now. Please try again.")
      setIsLoading(false) // Reset loading on error
    }
    // Note: We don't reset isLoading on success to prevent flash before redirect
  }

  const handleSwap = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setOriginPlace(destinationPlace)
    setDestinationPlace(originPlace)
  }

  const handleQuickApply = async (location: string) => {
    setIsPrefilling(true)
    const place = await fetchPlaceByLabel(location)
    setIsPrefilling(false)
    if (!place) {
      console.warn("No coordinates found for quick location:", location)
      return
    }

    if (activeField === 'origin') {
      setOriginPlace(place)
      setActiveField('destination')
    } else {
      setDestinationPlace(place)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      console.warn("Geolocation is not supported in this browser.")
      return
    }

    setIsPrefilling(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place: PlaceSuggestion = {
          id: `current-${Date.now()}`,
          label: "Current Location",
          address: "Current Location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setOriginPlace(place)
        setActiveField('destination')
        setIsPrefilling(false)
      },
      (error) => {
        console.error("Failed to read current location", error)
        setIsPrefilling(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <AuthGuard>
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-8rem)] px-2 sm:p-4 bg-gradient-hero">
        {/* Hero Section */}
        <div className="text-center mb-4 sm:mb-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-coral/10 text-coral text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Compare fares. Save time (and money!)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-warm-gray tracking-tight mb-2 sm:mb-3">
            Where to, <span className="text-coral">kabayan</span>?
          </h1>
          <p className="text-warm-gray/60 text-sm sm:text-lg mx-auto max-w-xs sm:max-w-none">
            Compare ride fares across ride-hailing services in seconds
          </p>
        </div>

        <Card className="w-full max-w-md border-0 shadow-xl shadow-warm-gray/10 bg-white animate-fade-in-up delay-100 mx-2 sm:mx-0">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-warm-gray flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-coral" />
              Plan Your Ride
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
              {/* Inputs Container */}
              <div
                ref={inputsContainerRef}
                className="relative rounded-2xl border border-border/60 bg-cream/50 p-4 space-y-3 animate-fade-in-up delay-150"
              >
                {/* Visual connector line - aligned with dynamic icon centers */}
                <div
                  className={`pointer-events-none absolute w-0.5 bg-gradient-to-b from-teal via-border to-coral transition-all duration-200 ${connectorStyle ? 'opacity-100' : 'opacity-0'}`}
                  style={
                    connectorStyle
                      ? {
                          left: connectorStyle.left,
                          top: connectorStyle.top,
                          height: connectorStyle.height,
                        }
                      : undefined
                  }
                />

                <div className="relative" style={{ zIndex: activeField === 'origin' ? 100 : 1 }}>
                  <LocationSearchInput
                    label="Pickup from?"
                    value={originPlace}
                    onChange={(place) => {
                      setOriginPlace(place)
                      if (place) {
                        setActiveField('destination')
                      }
                    }}
                    placeholder="Search pickup location"
                    onFocus={() => setActiveField('origin')}
                    icon={<div className="shrink-0 w-4 h-4 rounded-full bg-teal ring-4 ring-teal/20" />}
                    iconRef={originIconRef}
                  />
                </div>

                {/* Divider with Swap Button */}
                <div className="relative flex justify-end pr-4 -my-1 pointer-events-none" style={{ zIndex: 50 }}>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-full bg-white border-2 shadow-md pointer-events-auto hover:bg-coral/5 hover:border-coral/30 hover:rotate-180 transition-all duration-300"
                    onClick={handleSwap}
                  >
                    <ArrowUpDown className="h-4 w-4 text-warm-gray/70" />
                  </Button>
                </div>

                <div className="relative animate-fade-in-up delay-200" style={{ zIndex: activeField === 'destination' ? 100 : 1 }}>
                  <LocationSearchInput
                    label="Drop off to?"
                    value={destinationPlace}
                    onChange={(place) => setDestinationPlace(place)}
                    placeholder="Search destination"
                    onFocus={() => setActiveField('destination')}
                    icon={<div className="shrink-0 w-4 h-4 bg-coral ring-4 ring-coral/20 rounded-full" />}
                    iconRef={destinationIconRef}
                  />
                </div>
              </div>

              {/* Suggestions */}
              <div className="relative z-0 space-y-4 animate-fade-in-up delay-250">
                {/* Current Location */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-teal/5 transition-all text-left group border border-transparent hover:border-teal/20"
                  disabled={isPrefilling}
                >
                  <div className="p-2.5 rounded-full bg-teal/10 text-teal group-hover:bg-teal/20 transition-colors">
                    <Navigation className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-warm-gray">Use my current location</p>
                    <p className="text-xs text-warm-gray/50">Enable location services</p>
                  </div>
                </button>

                {/* Recent Places */}
                {recentPlaces.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-warm-gray/50 uppercase tracking-wider">
                      <History className="w-3 h-3" />
                      Recent
                      {isPrefilling && <Loader2 className="h-3.5 w-3.5 animate-spin text-coral" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentPlaces.map((place, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-coral/10 hover:text-coral px-3 py-1.5 text-sm font-normal transition-colors"
                          onClick={() => { void handleQuickApply(place) }}
                        >
                          {place}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Places */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-warm-gray/50 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Popular Destinations
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_LOCATIONS.map((place) => (
                      <Badge
                        key={place}
                        variant="outline"
                        className="cursor-pointer hover:bg-coral/5 hover:border-coral/30 hover:text-coral px-3 py-1.5 text-sm font-normal transition-colors"
                        onClick={() => { void handleQuickApply(place) }}
                      >
                        {place}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold shadow-xl shadow-coral/25 animate-fade-in-up delay-300" 
                disabled={isLoading || !originPlace || !destinationPlace}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finding best fares...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Compare Fares
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="mt-4 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-warm-gray/50 animate-fade-in-up delay-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
            <span>Grab</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-500" />
            <span>Angkas</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500" />
            <span>JoyRide</span>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
