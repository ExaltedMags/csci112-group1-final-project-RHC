"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, type FormEvent, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Navigation, ArrowUpDown, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import LocationSearchInput from "@/components/location-search-input"
import type { PlaceSuggestion } from "@/lib/mapbox"

interface HistoryEntry {
  originName: string;
  destinationName: string;
  requestedAt: string;
}

const POPULAR_LOCATIONS = [
  "Ateneo de Manila University",
  "UP Diliman",
  "BGC High Street",
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

  // Fetch history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/users/demo-user-123/history')
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
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)] p-4 bg-slate-50">
      <Card className="w-full max-w-md border-0 sm:border shadow-none sm:shadow-lg bg-transparent sm:bg-card">
        <CardHeader className="px-0 sm:px-6 pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Where to?</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Inputs Container */}
            <div className="relative bg-white rounded-xl shadow-sm border p-4 space-y-4">
              {/* Visual connector line */}
              <div className="absolute left-8 top-14 bottom-14 w-0.5 bg-slate-200 -z-0" />

              <div className="relative z-10">
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
                  icon={<div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50" />}
                />
              </div>

              {/* Divider with Swap Button */}
              <div className="relative z-20 flex justify-end pr-4 -my-2 pointer-events-none">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 rounded-full bg-white border shadow-sm pointer-events-auto hover:bg-slate-50"
                  onClick={handleSwap}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>

              <div className="relative z-10">
                <LocationSearchInput
                  label="Drop off to?"
                  value={destinationPlace}
                  onChange={(place) => setDestinationPlace(place)}
                  placeholder="Search destination"
                  onFocus={() => setActiveField('destination')}
                  icon={<div className="flex-shrink-0 w-4 h-4 bg-orange-500 ring-4 ring-orange-50" />}
                />
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-4">
              {/* Current Location */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                disabled={isPrefilling}
              >
                <div className="p-2 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <Navigation className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">Use my current location</p>
                  <p className="text-xs text-slate-500">Enable location services</p>
                </div>
              </button>

              {/* Recent Places */}
              {recentPlaces.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <History className="w-3 h-3" />
                    Recent
                    {isPrefilling && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentPlaces.map((place, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="cursor-pointer hover:bg-slate-200 px-3 py-1.5 text-sm font-normal"
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
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Popular
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCATIONS.map((place) => (
                    <Badge
                      key={place}
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100 px-3 py-1.5 text-sm font-normal"
                      onClick={() => { void handleQuickApply(place) }}
                    >
                      {place}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" 
              disabled={isLoading || !originPlace || !destinationPlace}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding rides...
                </>
              ) : (
                "Check Rates"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
