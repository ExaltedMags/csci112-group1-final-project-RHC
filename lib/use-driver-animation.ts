"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RideStatus } from "./ride-lifecycle"

type RouteCoordinate = { lat: number; lng: number }

export interface UseDriverAnimationOptions {
  /** The route coordinates from origin to destination */
  routeCoordinates: RouteCoordinate[] | null | undefined
  /** Current ride lifecycle status */
  status: RideStatus
  /** Speed multiplier (default: 1.0) */
  speedMultiplier?: number
  /** Whether animation is enabled (default: true) */
  enabled?: boolean
  /** Callback when driver reaches destination */
  onArrival?: () => void
}

export interface UseDriverAnimationResult {
  /** Current driver position (interpolated along route) */
  driverPosition: RouteCoordinate | null
  /** Progress from 0 to 1 along the route */
  progress: number
  /** Whether animation is currently running */
  isAnimating: boolean
}

/**
 * Configuration for different lifecycle phases
 * - APPROACHING: Driver coming TO pickup (moves backward from ~30% to origin)
 * - ON_TRIP: Driver going FROM pickup to destination (moves forward from origin to destination)
 */
interface PhaseConfig {
  /** Progress range on the route [startProgress, endProgress] */
  progressRange: [number, number]
  /** Duration in milliseconds for this phase */
  durationMs: number
  /** Whether this phase animates */
  animate: boolean
}

const PHASE_CONFIG: Record<string, PhaseConfig> = {
  // Before driver is assigned - no animation
  BOOKED: {
    progressRange: [0, 0],
    durationMs: 0,
    animate: false,
  },
  // Driver assigned - start approaching from "somewhere" (simulated as 0%)
  DRIVER_ASSIGNED: {
    progressRange: [0, 0.15],
    durationMs: 4000,
    animate: true,
  },
  // Driver arriving - continue to pickup
  DRIVER_ARRIVING: {
    progressRange: [0.15, 0.35],
    durationMs: 4000,
    animate: true,
  },
  // Driver arrived at pickup - at origin (0%)
  DRIVER_ARRIVED: {
    progressRange: [0.35, 0.4],
    durationMs: 3000,
    animate: true,
  },
  // Trip started - begin journey
  TRIP_STARTED: {
    progressRange: [0.4, 0.65],
    durationMs: 5000,
    animate: true,
  },
  // On trip - continue to destination
  ON_TRIP: {
    progressRange: [0.65, 0.95],
    durationMs: 4000,
    animate: true,
  },
  // Completed - at destination
  COMPLETED: {
    progressRange: [1, 1],
    durationMs: 0,
    animate: false,
  },
}

/**
 * Linearly interpolates between two coordinates
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Gets a position along the route path based on progress (0-1)
 * Uses linear interpolation between route points for smooth movement
 */
function getPositionOnRoute(
  coordinates: RouteCoordinate[],
  progress: number
): RouteCoordinate {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  
  if (coordinates.length === 0) {
    throw new Error("Cannot get position on empty route")
  }
  
  if (coordinates.length === 1) {
    return coordinates[0]
  }

  // Map progress to a position on the route
  const totalSegments = coordinates.length - 1
  const exactIndex = clampedProgress * totalSegments
  const lowerIndex = Math.floor(exactIndex)
  const upperIndex = Math.min(lowerIndex + 1, totalSegments)
  const segmentProgress = exactIndex - lowerIndex

  const pointA = coordinates[lowerIndex]
  const pointB = coordinates[upperIndex]

  return {
    lat: lerp(pointA.lat, pointB.lat, segmentProgress),
    lng: lerp(pointA.lng, pointB.lng, segmentProgress),
  }
}

/**
 * Custom hook for animating a driver marker along a route path
 * 
 * Features:
 * - Smooth interpolation between route points
 * - Lifecycle-aware animation phases
 * - Configurable speed
 * - Graceful fallbacks for missing/invalid route data
 */
export function useDriverAnimation({
  routeCoordinates,
  status,
  speedMultiplier = 1.0,
  enabled = true,
  onArrival,
}: UseDriverAnimationOptions): UseDriverAnimationResult {
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startProgressRef = useRef<number>(0)
  const onArrivalRef = useRef(onArrival)
  
  // Keep onArrival ref up to date
  useEffect(() => {
    onArrivalRef.current = onArrival
  }, [onArrival])

  // Validate route data
  const hasValidRoute = Array.isArray(routeCoordinates) && routeCoordinates.length >= 2
  
  // Log warning in development if route is missing/invalid
  useEffect(() => {
    if (!hasValidRoute && enabled && process.env.NODE_ENV === "development") {
      console.warn(
        "[useDriverAnimation] Cannot animate: route geometry missing or has fewer than 2 points",
        {
          hasCoordinates: !!routeCoordinates,
          length: routeCoordinates?.length ?? 0,
        }
      )
    }
  }, [hasValidRoute, enabled, routeCoordinates])

  // Get phase configuration for current status
  const phaseConfig = PHASE_CONFIG[status] || PHASE_CONFIG.BOOKED

  // Animation effect
  useEffect(() => {
    // Don't animate if disabled, route is invalid, or phase doesn't animate
    if (!enabled || !hasValidRoute || !phaseConfig.animate) {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setIsAnimating(false)
      
      // Set to phase end position if completed
      if (status === "COMPLETED") {
        setProgress(1)
      }
      return
    }

    const [targetStart, targetEnd] = phaseConfig.progressRange
    const phaseDuration = phaseConfig.durationMs / speedMultiplier

    // Initialize animation
    setIsAnimating(true)
    startTimeRef.current = null
    startProgressRef.current = progress

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
        // Start from current progress toward target range
        startProgressRef.current = Math.max(progress, targetStart)
      }

      const elapsed = timestamp - startTimeRef.current
      const phaseProgress = Math.min(elapsed / phaseDuration, 1)
      
      // Interpolate from start of phase range to end
      const newProgress = lerp(targetStart, targetEnd, phaseProgress)
      
      setProgress(newProgress)

      if (phaseProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        animationRef.current = null
        
        // Check if we've arrived at destination
        if (newProgress >= 0.99 && onArrivalRef.current) {
          onArrivalRef.current()
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [status, hasValidRoute, enabled, phaseConfig, speedMultiplier])

  // Calculate driver position from progress
  const driverPosition = (() => {
    if (!hasValidRoute || !routeCoordinates || !enabled) {
      return null
    }
    
    try {
      return getPositionOnRoute(routeCoordinates, progress)
    } catch (error) {
      console.error("[useDriverAnimation] Failed to calculate position:", error)
      return null
    }
  })()

  return {
    driverPosition,
    progress,
    isAnimating,
  }
}


