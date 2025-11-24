"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

import { ITrip } from "@/models/Trip"
import { PROVIDER_LABELS } from "@/lib/providers/adapters"
import { getProviderTheme } from "@/lib/provider-theme"
import {
  RIDE_LIFECYCLE_STEPS,
  generateMockDriver,
  getStepByIndex,
  type MockDriver,
  type RideStatus,
} from "@/lib/ride-lifecycle"
import { RideStepIndicator, RideProgressBar } from "@/components/ride-step-indicator"
import { DriverCard, DriverCardSkeleton } from "@/components/driver-card"
import { RideFeedbackModal } from "@/components/ride-feedback-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Navigation2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Share2,
  Shield,
} from "lucide-react"

const RideMap = dynamic(
  () => import("@/components/ride-map").then((mod) => mod.RideMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
        Loading map...
      </div>
    ),
  }
)

interface TripProgressViewProps {
  trip: ITrip & { _id: string }
}

type RouteCoordinate = { lat: number; lng: number }

export default function TripProgressView({ trip }: TripProgressViewProps) {
  const router = useRouter()
  const providerId = trip.selectedQuote?.provider ?? trip.quotes[0]?.provider ?? "GrabPH"
  const theme = getProviderTheme(providerId)
  const accentColor = theme.mapColor
  const isMC = trip.selectedQuote?.category === "2-wheel" || providerId === "Angkas" || providerId === "JoyRideMC"

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [driver, setDriver] = useState<MockDriver | null>(null)
  const [driverPosition, setDriverPosition] = useState<RouteCoordinate | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentStep = getStepByIndex(currentStepIndex)
  const isCompleted = currentStep.status === "COMPLETED"
  const showDriverCard = currentStepIndex >= 1 // Show after BOOKED

  const providerLabel = useMemo(() => {
    return PROVIDER_LABELS[providerId]?.split("(")[0].trim() ?? providerId
  }, [providerId])

  const selectedQuote = useMemo(() => {
    return trip.selectedQuote ?? trip.quotes.find((q) => q.provider === providerId) ?? trip.quotes[0]
  }, [trip.selectedQuote, trip.quotes, providerId])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value)

  const averageFare = selectedQuote
    ? Math.round((selectedQuote.minFare + selectedQuote.maxFare) / 2)
    : 0

  // Generate mock driver when assigned
  useEffect(() => {
    if (currentStepIndex === 1 && !driver) {
      setDriver(generateMockDriver(isMC))
    }
  }, [currentStepIndex, driver, isMC])

  // Simulate driver position moving along route
  const simulateDriverMovement = useCallback(() => {
    if (!trip.routeGeometry?.coordinates?.length || currentStepIndex < 1) {
      return
    }

    const coords = trip.routeGeometry.coordinates
    const totalPoints = coords.length

    // Determine position based on current step
    let targetProgress = 0
    switch (currentStep.status) {
      case "DRIVER_ASSIGNED":
        targetProgress = 0.1
        break
      case "DRIVER_ARRIVING":
        targetProgress = 0.3
        break
      case "DRIVER_ARRIVED":
        targetProgress = 0
        break
      case "TRIP_STARTED":
        targetProgress = 0.2
        break
      case "ON_TRIP":
        targetProgress = 0.6
        break
      case "COMPLETED":
        targetProgress = 1
        break
      default:
        targetProgress = 0
    }

    // For arriving states, position from end (destination to origin)
    // For trip states, position from start (origin to destination)
    const isApproaching = ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED"].includes(currentStep.status)
    
    let pointIndex: number
    if (isApproaching) {
      // Driver coming from somewhere to pickup (use origin area)
      pointIndex = Math.floor(targetProgress * Math.min(5, totalPoints - 1))
    } else {
      // Driver going from origin to destination
      pointIndex = Math.floor(targetProgress * (totalPoints - 1))
    }

    const coord = coords[Math.min(pointIndex, totalPoints - 1)]
    if (coord) {
      setDriverPosition({ lat: coord.lat, lng: coord.lng })
    }
  }, [trip.routeGeometry?.coordinates, currentStepIndex, currentStep.status])

  // Run driver movement simulation
  useEffect(() => {
    if (currentStepIndex >= 1 && !isCompleted) {
      simulateDriverMovement()
      
      // Animate driver position updates
      animationRef.current = setInterval(() => {
        simulateDriverMovement()
      }, 2000)

      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current)
        }
      }
    }
  }, [currentStepIndex, isCompleted, simulateDriverMovement])

  // Auto-advance through lifecycle steps
  useEffect(() => {
    if (isCompleted) {
      // Show feedback modal after completion
      const feedbackDelay = setTimeout(() => {
        setShowFeedback(true)
      }, 1500)
      return () => clearTimeout(feedbackDelay)
    }

    const step = RIDE_LIFECYCLE_STEPS[currentStepIndex]
    if (!step || step.durationMs === 0) return

    timerRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, RIDE_LIFECYCLE_STEPS.length - 1))
    }, step.durationMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentStepIndex, isCompleted])

  const handleFeedbackSubmit = (rating: number, comment: string, tip: number) => {
    console.log("Feedback submitted:", { rating, comment, tip })
    setShowFeedback(false)
    setFeedbackSubmitted(true)
  }

  const handleFeedbackClose = () => {
    setShowFeedback(false)
    setFeedbackSubmitted(true)
  }

  const handleGoToHistory = () => {
    router.push("/history")
  }

  // Status-specific messages
  const getStatusMessage = (): string => {
    switch (currentStep.status) {
      case "BOOKED":
        return "Finding you the best driver nearby..."
      case "DRIVER_ASSIGNED":
        return `${driver?.name ?? "Driver"} is on the way to pick you up`
      case "DRIVER_ARRIVING":
        return `${driver?.name ?? "Driver"} is almost at your location`
      case "DRIVER_ARRIVED":
        return "Your driver has arrived! Please proceed to pickup point"
      case "TRIP_STARTED":
        return "Trip started. Enjoy your ride!"
      case "ON_TRIP":
        return "On the way to your destination"
      case "COMPLETED":
        return "You have arrived at your destination!"
      default:
        return currentStep.description
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto border-x shadow-xl relative overflow-hidden">
      {/* Feedback Modal */}
      {driver && (
        <RideFeedbackModal
          isOpen={showFeedback}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
          driver={driver}
          fare={averageFare}
          accentColor={accentColor}
          providerName={providerLabel}
        />
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: accentColor }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="text-center text-white">
          <p className="text-sm font-medium opacity-90">
            {isCompleted ? "Trip Completed" : currentStep.label}
          </p>
          <p className="text-xs opacity-75">{providerLabel}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-white hover:bg-white/20"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Map Section - Large area */}
      <div className="relative h-[45vh] min-h-[280px]">
        <RideMap
          origin={trip.originLocation}
          destination={trip.destinationLocation}
          path={trip.routeGeometry?.coordinates ?? null}
          accentColor={accentColor}
          className="h-full w-full"
          showControls={false}
          driverPosition={showDriverCard ? driverPosition : null}
          driverIsMC={isMC}
        />

        {/* Status Overlay on Map */}
        <div className="absolute top-4 left-4 right-4">
          <div
            className="rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm"
            style={{ backgroundColor: `${accentColor}ee` }}
          >
            <p className="text-white text-sm font-medium text-center">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* Safety badge */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-gray-700">Trip protected</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative -mt-6 rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] min-h-[50vh]">
        <div className="px-4 pt-6 pb-24 space-y-5">
          {/* Progress Bar */}
          <RideProgressBar
            steps={RIDE_LIFECYCLE_STEPS}
            currentStepIndex={currentStepIndex}
            accentColor={accentColor}
          />

          {/* Driver Card */}
          <div className="mt-4">
            {showDriverCard && driver ? (
              <DriverCard
                driver={driver}
                accentColor={accentColor}
                isMC={isMC}
                compact
              />
            ) : (
              <DriverCardSkeleton compact />
            )}
          </div>

          {/* Route Info */}
          <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                  Pickup
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {trip.origin}
                </p>
              </div>
            </div>

            {/* Connector */}
            <div className="ml-1.5 w-0.5 h-3 bg-gray-300" />

            {/* Drop-off */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div
                  className="w-3 h-3 rounded-full ring-4"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 0 4px ${accentColor}20`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                  Drop-off
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {trip.destination}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Navigation2 className="w-4 h-4" />
                <span className="text-sm">{trip.distanceKm} km</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">~{selectedQuote?.eta ?? "--"} mins</span>
              </div>
              <div className="ml-auto">
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(averageFare)}
                </span>
              </div>
            </div>
          </div>

          {/* Step Timeline (Vertical) */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Ride Progress
            </h3>
            <RideStepIndicator
              steps={RIDE_LIFECYCLE_STEPS}
              currentStepIndex={currentStepIndex}
              accentColor={accentColor}
              orientation="vertical"
              compact
            />
          </div>

          {/* Emergency / Help Section */}
          {!isCompleted && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-3 border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-800">Need help?</p>
                <p className="text-[10px] text-red-600">
                  Tap here for emergency assistance
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-red-700 hover:bg-red-100"
              >
                <Phone className="w-3.5 h-3.5 mr-1" />
                SOS
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 z-50">
        {isCompleted ? (
          feedbackSubmitted ? (
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              style={{ backgroundColor: accentColor }}
              onClick={handleGoToHistory}
            >
              View Ride History
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              style={{ backgroundColor: accentColor }}
              onClick={() => setShowFeedback(true)}
            >
              Rate Your Ride
            </Button>
          )
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Estimated fare</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(averageFare)}
              </p>
            </div>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancel Ride
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
