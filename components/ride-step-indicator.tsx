"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { type RideLifecycleStep } from "@/lib/ride-lifecycle"

interface RideStepIndicatorProps {
  steps: RideLifecycleStep[]
  currentStepIndex: number
  accentColor: string
  orientation?: "horizontal" | "vertical"
  compact?: boolean
}

export function RideStepIndicator({
  steps,
  currentStepIndex,
  accentColor,
  orientation = "horizontal",
  compact = false,
}: RideStepIndicatorProps) {
  const isVertical = orientation === "vertical"

  return (
    <div
      className={cn(
        "w-full",
        isVertical ? "flex flex-col gap-0" : "flex items-start justify-between"
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex
        const isActive = index === currentStepIndex
        const isUpcoming = index > currentStepIndex
        const isLast = index === steps.length - 1

        return (
          <div
            key={step.status}
            className={cn(
              isVertical
                ? "flex items-start gap-3"
                : "flex flex-col items-center",
              !isVertical && !isLast && "flex-1"
            )}
          >
            {/* Step indicator dot/icon */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-300",
                  compact ? "h-6 w-6" : "h-8 w-8",
                  isCompleted && "border-transparent",
                  isActive && "border-transparent ring-4 ring-opacity-30",
                  isUpcoming && "border-gray-300 bg-white"
                )}
                style={{
                  backgroundColor: isCompleted || isActive ? accentColor : undefined,
                  borderColor: isActive ? accentColor : undefined,
                  boxShadow: isActive ? `0 0 0 4px ${accentColor}30` : undefined,
                }}
              >
                {isCompleted ? (
                  <Check
                    className={cn(
                      "text-white",
                      compact ? "h-3 w-3" : "h-4 w-4"
                    )}
                    strokeWidth={3}
                  />
                ) : isActive ? (
                  <div
                    className={cn(
                      "rounded-full bg-white",
                      compact ? "h-2 w-2" : "h-2.5 w-2.5"
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "rounded-full bg-gray-300",
                      compact ? "h-2 w-2" : "h-2.5 w-2.5"
                    )}
                  />
                )}
              </div>

              {/* Connector line (vertical) */}
              {isVertical && !isLast && (
                <div
                  className={cn(
                    "w-0.5 transition-all duration-300",
                    compact ? "h-6 my-1" : "h-8 my-1.5"
                  )}
                  style={{
                    backgroundColor: isCompleted ? accentColor : "#e5e7eb",
                  }}
                />
              )}
            </div>

            {/* Connector line (horizontal) */}
            {!isVertical && !isLast && (
              <div
                className={cn(
                  "flex-1 transition-all duration-300 mx-2",
                  compact ? "h-0.5 mt-3" : "h-0.5 mt-4"
                )}
                style={{
                  backgroundColor: isCompleted ? accentColor : "#e5e7eb",
                }}
              />
            )}

            {/* Label */}
            <div
              className={cn(
                isVertical ? "flex-1 pb-2" : "mt-2 text-center",
                compact && "pb-0"
              )}
            >
              <p
                className={cn(
                  "font-medium transition-colors duration-300",
                  compact ? "text-xs" : "text-sm",
                  isCompleted && "text-gray-600",
                  isActive && "font-semibold",
                  isUpcoming && "text-gray-400"
                )}
                style={{ color: isActive ? accentColor : undefined }}
              >
                {step.label}
              </p>
              {!compact && isVertical && (
                <p
                  className={cn(
                    "text-xs text-gray-500 mt-0.5",
                    isUpcoming && "text-gray-400"
                  )}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Compact horizontal progress bar version
 */
interface RideProgressBarProps {
  steps: RideLifecycleStep[]
  currentStepIndex: number
  accentColor: string
}

export function RideProgressBar({
  steps,
  currentStepIndex,
  accentColor,
}: RideProgressBarProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">
          {steps[currentStepIndex]?.label ?? "Processing"}
        </span>
        <span className="text-xs text-gray-500">
          {currentStepIndex + 1} / {steps.length}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>
    </div>
  )
}

