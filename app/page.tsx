"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Navigation, ArrowUpDown, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  origin: z.string().min(2, {
    message: "Pickup location is required (min 2 chars).",
  }),
  destination: z.string().min(2, {
    message: "Destination is required (min 2 chars).",
  }),
})

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: "",
      destination: "",
    },
  })

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trips/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error('Failed to search trips')
      }

      const data = await response.json()
      router.push(`/trip/${data.tripId}`)
    } catch (error) {
      console.error(error)
      setIsLoading(false) // Reset loading on error
    }
    // Note: We don't reset isLoading on success to prevent flash before redirect
  }

  const handleSwap = (e: React.MouseEvent) => {
    e.preventDefault()
    const currentOrigin = form.getValues("origin")
    const currentDest = form.getValues("destination")
    form.setValue("origin", currentDest)
    form.setValue("destination", currentOrigin)
  }

  const handleLocationSelect = (location: string) => {
    // Fill the active field, or default to destination if origin is filled, etc.
    // Simple logic: fill currently focused field if tracked, otherwise fill empty one starting with origin
    
    const currentOrigin = form.getValues("origin")
    
    if (activeField === 'origin') {
      form.setValue("origin", location)
      // Auto-focus destination if origin was just filled
      form.setFocus("destination")
      setActiveField('destination')
    } else {
      form.setValue("destination", location)
    }
  }

  const handleUseCurrentLocation = () => {
    form.setValue("origin", "Current Location")
    form.setFocus("destination")
    setActiveField('destination')
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)] p-4 bg-slate-50">
      <Card className="w-full max-w-md border-0 sm:border shadow-none sm:shadow-lg bg-transparent sm:bg-card">
        <CardHeader className="px-0 sm:px-6 pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Where to?</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Inputs Container */}
              <div className="relative bg-white rounded-xl shadow-sm border p-4 space-y-4">
                
                {/* Visual connector line */}
                <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-slate-200 -z-0" />

                {/* Origin Input */}
                <div className="relative z-10">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                          <FormControl>
                            <div className="flex-1">
                              <Input 
                                placeholder="Pickup from?" 
                                className="border-0 bg-slate-50 focus-visible:ring-0 focus-visible:bg-slate-100 font-medium text-base h-12 rounded-lg px-4"
                                {...field} 
                                onFocus={() => setActiveField('origin')}
                              />
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage className="pl-7 text-xs" />
                      </FormItem>
                    )}
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

                {/* Destination Input */}
                <div className="relative z-10">
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-4 h-4 rounded-none bg-orange-500 ring-4 ring-orange-50" />
                          <FormControl>
                            <div className="flex-1">
                              <Input 
                                placeholder="Drop off to?" 
                                className="border-0 bg-slate-50 focus-visible:ring-0 focus-visible:bg-slate-100 font-medium text-base h-12 rounded-lg px-4"
                                {...field}
                                onFocus={() => setActiveField('destination')}
                              />
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage className="pl-7 text-xs" />
                      </FormItem>
                    )}
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentPlaces.map((place, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-slate-200 px-3 py-1.5 text-sm font-normal"
                          onClick={() => handleLocationSelect(place)}
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
                        onClick={() => handleLocationSelect(place)}
                      >
                        {place}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" 
                disabled={isLoading}
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
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
