"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Star, X, ThumbsUp, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type MockDriver } from "@/lib/ride-lifecycle"

interface RideFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, comment: string, tip: number) => void
  driver: MockDriver
  fare: number
  accentColor: string
  providerName: string
}

const TIP_OPTIONS = [0, 20, 50, 100]

const QUICK_COMMENTS = [
  "Great driver!",
  "Safe driving",
  "Very polite",
  "Clean vehicle",
  "Good conversation",
  "Knows the route",
]

export function RideFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  driver,
  fare,
  accentColor,
  providerName,
}: RideFeedbackModalProps) {
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [selectedTip, setSelectedTip] = useState(0)
  const [selectedQuickComments, setSelectedQuickComments] = useState<string[]>([])

  if (!isOpen) return null

  const handleQuickCommentToggle = (text: string) => {
    setSelectedQuickComments((prev) =>
      prev.includes(text)
        ? prev.filter((c) => c !== text)
        : [...prev, text]
    )
  }

  const handleSubmit = () => {
    const fullComment = [...selectedQuickComments, comment].filter(Boolean).join(". ")
    onSubmit(rating, fullComment, selectedTip)
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(val)

  const displayRating = hoveredRating || rating

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        {/* Header */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white text-3xl font-bold"
            style={{ backgroundColor: accentColor }}
          >
            ✓
          </div>
          <h2 className="text-xl font-bold text-gray-900">Trip Completed!</h2>
          <p className="text-sm text-gray-600 mt-1">
            Thanks for riding with {providerName}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Fare Summary */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Fare</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(fare)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Driver</p>
              <p className="font-semibold text-gray-900">{driver.name}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-3">
              How was your ride?
            </p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-200"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {displayRating === 5
                ? "Excellent!"
                : displayRating === 4
                ? "Great"
                : displayRating === 3
                ? "Good"
                : displayRating === 2
                ? "Fair"
                : "Poor"}
            </p>
          </div>

          {/* Quick Comments */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Quick feedback
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMENTS.map((text) => (
                <button
                  key={text}
                  onClick={() => handleQuickCommentToggle(text)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    selectedQuickComments.includes(text)
                      ? "text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                  style={
                    selectedQuickComments.includes(text)
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Additional comments
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="w-full h-20 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
            />
          </div>

          {/* Tip */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Add a tip for {driver.name.split(" ")[0]}?
            </p>
            <div className="flex gap-2">
              {TIP_OPTIONS.map((tip) => (
                <button
                  key={tip}
                  onClick={() => setSelectedTip(tip)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    selectedTip === tip
                      ? "text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                  style={
                    selectedTip === tip
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  {tip === 0 ? "No tip" : formatCurrency(tip)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg font-bold rounded-xl"
            style={{ backgroundColor: accentColor }}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  )
}

