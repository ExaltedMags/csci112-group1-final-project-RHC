import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-coral text-white hover:bg-coral/90",
        secondary:
          "border-transparent bg-cream text-warm-gray hover:bg-coral/10",
        destructive:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200",
        outline: "border-border text-warm-gray bg-white",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        teal: "border-transparent bg-teal-light text-teal",
        grab: "border-transparent bg-emerald-100 text-emerald-700",
        angkas: "border-transparent bg-orange-100 text-orange-700",
        joyride: "border-transparent bg-indigo-100 text-indigo-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
