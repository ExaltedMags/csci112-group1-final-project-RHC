"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LatLngBoundsExpression, LatLngExpression, DivIcon } from "leaflet"
import { useMap, MapContainer, Marker, Polyline, TileLayer, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { cn } from "@/lib/utils"
import { mapTileLayerConfig } from "@/lib/map-tiles"

type RouteCoordinate = {
  lat: number
  lng: number
}

type TripLocation = RouteCoordinate & {
  label: string
}

interface RideMapProps {
  origin?: TripLocation | null
  destination?: TripLocation | null
  path?: RouteCoordinate[] | null
  accentColor?: string
  className?: string
  showControls?: boolean
  /** Optional driver position to show on map */
  driverPosition?: RouteCoordinate | null
  /** Whether driver is on a motorcycle (affects icon) */
  driverIsMC?: boolean
}

const FALLBACK_LOCATION = {
  label: "Metro Manila",
  lat: 14.5995,
  lng: 120.9842,
}

type LeafletLib = typeof import("leaflet")

export function RideMap({
  origin,
  destination,
  path,
  accentColor = "#0f172a",
  className,
  showControls = true,
  driverPosition,
  driverIsMC = false,
}: RideMapProps) {
  const hasOrigin = isValidTripLocation(origin)
  const hasDestination = isValidTripLocation(destination)
  const hasRoute = hasOrigin && hasDestination

  const safeOrigin = hasOrigin && origin ? origin : FALLBACK_LOCATION
  const safeDestination = hasDestination && destination ? destination : FALLBACK_LOCATION
  const pathPoints = useMemo(
    () => (Array.isArray(path) ? path.filter(isValidCoordinate) : []),
    [path],
  )
  const hasPathPolyline = pathPoints.length >= 2

  useEffect(() => {
    if (!hasRoute) {
      console.warn("[RideMap] Map unavailable due to missing coordinates", {
        origin,
        destination,
      })
    }
  }, [hasRoute, origin, destination])

  useEffect(() => {
    if (path && path.length > 0 && !hasPathPolyline) {
      console.warn("[RideMap] Route geometry missing or invalid, rendering markers only", {
        pathLength: path.length,
        pathPointsLength: pathPoints.length,
        pathSample: path.slice(0, 3),
      })
    }
  }, [path, hasPathPolyline, pathPoints.length])

  const extentPoints = useMemo(
    () => (hasPathPolyline ? pathPoints : [safeOrigin, safeDestination]),
    [hasPathPolyline, pathPoints, safeOrigin, safeDestination],
  )

  // Calculate bounds with dynamic padding based on route extent
  const bounds = useMemo<LatLngBoundsExpression>(() => {
    const lats = extentPoints.map((point) => point.lat)
    const lngs = extentPoints.map((point) => point.lng)

    const south = Math.min(...lats)
    const north = Math.max(...lats)
    const west = Math.min(...lngs)
    const east = Math.max(...lngs)

    // Calculate extent size to determine appropriate padding
    const latSpan = north - south
    const lngSpan = east - west
    // Use 15% padding of the larger span, with min/max limits
    const paddingFactor = 0.15
    const latPadding = Math.max(0.005, Math.min(0.02, latSpan * paddingFactor))
    const lngPadding = Math.max(0.005, Math.min(0.02, lngSpan * paddingFactor))

    return [
      [south - latPadding, west - lngPadding],
      [north + latPadding, east + lngPadding],
    ]
  }, [extentPoints])

  const midpoint: LatLngExpression = useMemo(() => {
    const latAverage = extentPoints.reduce((sum, point) => sum + point.lat, 0) / extentPoints.length
    const lngAverage = extentPoints.reduce((sum, point) => sum + point.lng, 0) / extentPoints.length
    return [latAverage, lngAverage]
  }, [extentPoints])

  const originPoint: LatLngExpression = [safeOrigin.lat, safeOrigin.lng]
  const destinationPoint: LatLngExpression = [safeDestination.lat, safeDestination.lng]
  const routePolyline = useMemo<LatLngExpression[] | null>(
    () =>
      hasPathPolyline
        ? pathPoints.map((point) => [point.lat, point.lng] as LatLngExpression)
        : null,
    [hasPathPolyline, pathPoints],
  )

  useEffect(() => {
    if (hasPathPolyline && routePolyline) {
      console.log("[RideMap] Route geometry available", {
        pointCount: pathPoints.length,
        routePolylineLength: routePolyline.length,
        firstPoint: routePolyline[0],
        lastPoint: routePolyline[routePolyline.length - 1],
      })
    }
  }, [hasPathPolyline, routePolyline, pathPoints.length])

  const [animatedPath, setAnimatedPath] = useState<LatLngExpression[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const previousPathRef = useRef<string>("")

  // Create a stable signature from pathPoints to detect route changes
  const routeSignature = useMemo(() => {
    if (!hasPathPolyline || pathPoints.length < 2) {
      return ""
    }
    // Use first, middle, and last points to create a signature
    const first = pathPoints[0]
    const last = pathPoints[pathPoints.length - 1]
    const mid = pathPoints[Math.floor(pathPoints.length / 2)]
    return `${first.lat.toFixed(6)},${first.lng.toFixed(6)}|${mid.lat.toFixed(6)},${mid.lng.toFixed(6)}|${last.lat.toFixed(6)},${last.lng.toFixed(6)}|${pathPoints.length}`
  }, [hasPathPolyline, pathPoints])

  useEffect(() => {
    // Skip if route hasn't changed
    if (routeSignature === previousPathRef.current) {
      return
    }
    previousPathRef.current = routeSignature

    // Cancel any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (!routePolyline || routePolyline.length < 2) {
      console.log("[RideMap] No route polyline to animate", {
        hasRoutePolyline: !!routePolyline,
        length: routePolyline?.length ?? 0,
      })
      setAnimatedPath(routePolyline ?? [])
      return
    }

    console.log("[RideMap] Starting route animation", {
      pointCount: routePolyline.length,
      signature: routeSignature.substring(0, 50) + "...",
    })

    // Start animation from first point
    setAnimatedPath([routePolyline[0]])

    let cancelled = false
    const polyline = routePolyline

    const animationDurationMs = 2200
    const frameDurationMs = 16
    const totalPoints = polyline.length
    const frameCount = Math.max(1, Math.ceil(animationDurationMs / frameDurationMs))
    const chunkSize = Math.max(1, Math.ceil(totalPoints / frameCount))

    let currentIndex = 1

    const animate = () => {
      if (cancelled) {
        return
      }

      const nextIndex = Math.min(totalPoints, currentIndex + chunkSize)

      setAnimatedPath((previous) => {
        if (previous.length >= totalPoints) {
          return previous
        }

        const additions = polyline.slice(previous.length, nextIndex)
        if (!additions.length) {
          return previous
        }

        return [...previous, ...additions]
      })

      currentIndex = nextIndex

      if (currentIndex < totalPoints) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Ensure we show the complete path when done
        setAnimatedPath(polyline)
        console.log("[RideMap] Route animation completed")
      }
    }

    try {
      animationFrameRef.current = requestAnimationFrame(animate)
    } catch (error) {
      console.error("[RideMap] Route animation failed, showing static route", error)
      setAnimatedPath(polyline)
    }

    return () => {
      cancelled = true

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [routeSignature, routePolyline])

  // Show polyline if we have animated path OR if we have a static route but animation hasn't started yet
  const hasAnimatedPolyline = animatedPath.length >= 2 || (routePolyline !== null && routePolyline.length >= 2 && animatedPath.length === 0)
  const polylineToRender = hasAnimatedPolyline && animatedPath.length >= 2 ? animatedPath : (routePolyline ?? [])

  const [leafletLib, setLeafletLib] = useState<LeafletLib | null>(null)

  useEffect(() => {
    // In Next.js 14 (App Router), simple dynamic imports of 'leaflet' often suffice 
    // to just get the 'window' check passed, but we still need the L object for Icons.
    let isMounted = true
    import("leaflet").then((module) => {
      if (isMounted) {
        // Fix marker icon issue in Webpack
        // @ts-expect-error Leaflet types omit private _getIconUrl helper
        delete module.Icon.Default.prototype._getIconUrl
        module.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })
        
        setLeafletLib(module)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const pickupIcon = useMemo<DivIcon | undefined>(
    () => (leafletLib ? createMarkerIcon(leafletLib, "#2563eb") : undefined),
    [leafletLib],
  )
  const dropoffIcon = useMemo<DivIcon | undefined>(
    () => (leafletLib ? createMarkerIcon(leafletLib, accentColor) : undefined),
    [leafletLib, accentColor],
  )
  const driverIcon = useMemo<DivIcon | undefined>(
    () => (leafletLib ? createDriverIcon(leafletLib, accentColor, driverIsMC) : undefined),
    [leafletLib, accentColor, driverIsMC],
  )

  const hasDriverPosition = isValidCoordinate(driverPosition)
  const driverPoint: LatLngExpression | null = hasDriverPosition && driverPosition
    ? [driverPosition.lat, driverPosition.lng]
    : null

  if (!hasRoute || !origin || !destination) {
    return (
      <div
        className={cn(
          "flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm font-medium text-gray-500",
          className,
        )}
      >
        Map unavailable for this trip
        <span className="mt-1 text-xs font-normal text-gray-400">
          Missing pickup or drop-off coordinates
        </span>
      </div>
    )
  }

  // Only block rendering if we absolutely need the L object (for icons)
  // but we can render the map container itself immediately if we're client-side
  if (!leafletLib) {
     return (
      <div
        className={cn(
          "flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white text-center text-sm text-gray-500",
          className,
        )}
      >
        Loading map…
      </div>
    )
  }

  return (
    <div className={cn("relative z-0 isolate w-full min-h-[260px] overflow-hidden", className)}>
      <MapContainer
        center={midpoint}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer 
          url={mapTileLayerConfig.url} 
          attribution={mapTileLayerConfig.attribution}
          maxZoom={mapTileLayerConfig.maxZoom}
        />

        {/* Route polyline - rendered with provider accent color */}
        {/* Uses thicker weight (5px) and high opacity for clear visibility */}
        {hasAnimatedPolyline && polylineToRender.length >= 2 && (
          <>
            {/* Subtle shadow/outline for better contrast on varied backgrounds */}
            <Polyline
              positions={polylineToRender}
              pathOptions={{
                color: "#000000",
                weight: 7,
                opacity: 0.1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Main route line with provider accent color */}
            <Polyline
              positions={polylineToRender}
              pathOptions={{
                color: accentColor,
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        <Marker position={originPoint} icon={pickupIcon} title={`Pickup: ${origin.label}`} />
        <Marker
          position={destinationPoint}
          icon={dropoffIcon}
          title={`Drop-off: ${destination.label}`}
        />

        {/* Driver marker */}
        {hasDriverPosition && driverPoint && driverIcon && (
          <Marker
            position={driverPoint}
            icon={driverIcon}
            title="Driver location"
          />
        )}

        {showControls && <ZoomControl position="bottomright" />}

        <MapViewController bounds={bounds} fallbackCenter={midpoint} />
      </MapContainer>
    </div>
  )
}

/**
 * Map view controller that fits bounds to show the full route
 * - Uses padding to ensure markers aren't at edges
 * - Constrains zoom levels for optimal route visibility
 * - minZoom: 11 prevents zooming out too far (route becomes tiny)
 * - maxZoom: 16 prevents zooming in too close (route not visible)
 */
function MapViewController({
  bounds,
  fallbackCenter,
}: {
  bounds: LatLngBoundsExpression
  fallbackCenter: LatLngExpression
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) {
      return
    }

    try {
      // Fit bounds with comfortable padding and zoom constraints
      map.fitBounds(bounds, { 
        padding: [40, 40],
        maxZoom: 16,  // Don't zoom in too close
      })
      
      // Ensure we don't zoom out too far (route should be clearly visible)
      const currentZoom = map.getZoom()
      if (currentZoom < 11) {
        map.setZoom(11)
      }
    } catch {
      map.setView(fallbackCenter, 13)
    }
  }, [map, bounds, fallbackCenter])

  return null
}

/**
 * Creates a compact, modern marker icon for pickup/dropoff points
 * - Smaller size (20px) for cleaner map appearance
 * - Proper anchor point aligned to marker center
 * - Provider-themed colors passed via `color` parameter
 */
function createMarkerIcon(leaflet: LeafletLib, color: string) {
  return leaflet.divIcon({
    className: "",
    html: `<div style="
      position: relative;
      width: 20px;
      height: 20px;
    ">
      <span style="
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(15,23,42,0.25);
        border: 2.5px solid #fff;
        background: ${color};
      "></span>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}

/**
 * Creates an animated driver marker icon that follows the route
 * - Compact size (36px) with subtle pulsing animation
 * - Provider-themed color for border and glow effects
 * - Vehicle emoji (car/motorcycle) based on service type
 * - Anchor point centered for accurate route following
 */
function createDriverIcon(leaflet: LeafletLib, color: string, isMC: boolean) {
  const vehicleEmoji = isMC ? "🏍️" : "🚗"
  // Create a unique ID for this icon's animation to avoid CSS conflicts
  const animId = `driver-${Math.random().toString(36).slice(2, 8)}`
  
  return leaflet.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
      ">
        <!-- Subtle pulse ring for visibility -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 36px;
          height: 36px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: ${color}18;
          animation: ${animId}-pulse 2s ease-out infinite;
        "></div>
        <!-- Main driver icon -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          box-shadow: 0 2px 10px ${color}40, 0 1px 4px rgba(0,0,0,0.1);
          border: 2.5px solid ${color};
          background: white;
          font-size: 14px;
        ">
          ${vehicleEmoji}
        </div>
        <style>
          @keyframes ${animId}-pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
          }
        </style>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

function isValidTripLocation(location?: TripLocation | null): location is TripLocation {
  return (
    Boolean(location?.label) &&
    isValidCoordinate(location)
  )
}

function isValidCoordinate(location?: RouteCoordinate | null): location is RouteCoordinate {
  return (
    Boolean(location) &&
    typeof location?.lat === "number" &&
    typeof location?.lng === "number" &&
    !Number.isNaN(location.lat) &&
    !Number.isNaN(location.lng)
  )
}
