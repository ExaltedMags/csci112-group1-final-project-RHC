"use client"

import { cn } from "@/lib/utils"
import { type MockDriver } from "@/lib/ride-lifecycle"
import { Star, Phone, MessageSquare, User, Car, Bike } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DriverCardProps {
  driver: MockDriver
  accentColor: string
  isMC?: boolean
  showActions?: boolean
  compact?: boolean
  className?: string
}

export function DriverCard({
  driver,
  accentColor,
  isMC = false,
  showActions = true,
  compact = false,
  className,
}: DriverCardProps) {
  const VehicleIcon = isMC ? Bike : Car

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100",
          className
        )}
      >
        {/* Driver Avatar */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <User className="h-6 w-6" style={{ color: accentColor }} />
        </div>

        {/* Driver Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 truncate">{driver.name}</span>
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-gray-700">{driver.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <VehicleIcon className="h-3.5 w-3.5" />
            <span className="truncate">{driver.vehicleModel}</span>
            <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
              {driver.vehiclePlate}
            </span>
          </div>
        </div>

        {/* ETA Badge */}
        <div
          className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <span className="text-lg font-bold" style={{ color: accentColor }}>
            {driver.eta}
          </span>
          <span className="text-[10px] text-gray-500">min</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4 shadow-lg border-2 transition-all",
        className
      )}
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Header with driver info */}
      <div className="flex items-start gap-4">
        {/* Driver Avatar */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full ring-4"
          style={{
            backgroundColor: `${accentColor}15`,
            boxShadow: `0 0 0 4px ${accentColor}20`,
          }}
        >
          <User className="h-8 w-8" style={{ color: accentColor }} />
        </div>

        {/* Driver Details */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-700">
                {driver.rating}
              </span>
            </div>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {driver.trips.toLocaleString()} trips
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-gray-200"
            >
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-gray-200"
            >
              <Phone className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <VehicleIcon className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {driver.vehicleModel}
            </p>
            <p className="text-xs text-gray-500">{driver.vehicleColor}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-gray-900">
            {driver.vehiclePlate}
          </p>
          <p className="text-xs text-gray-500">Plate number</p>
        </div>
      </div>

      {/* ETA Banner */}
      <div
        className="mt-3 flex items-center justify-between rounded-xl p-3"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        <span className="text-sm font-medium" style={{ color: accentColor }}>
          Estimated arrival
        </span>
        <span className="text-lg font-bold" style={{ color: accentColor }}>
          {driver.eta} mins
        </span>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for driver card
 */
export function DriverCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-3 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-12 w-14 rounded-xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg border-2 border-gray-100 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-28 rounded bg-gray-200" />
          <div className="h-4 w-36 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mt-4 h-16 rounded-xl bg-gray-100" />
      <div className="mt-3 h-12 rounded-xl bg-gray-100" />
    </div>
  )
}

