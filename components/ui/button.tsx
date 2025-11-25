import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-coral text-white shadow-md shadow-coral/25 hover:shadow-lg hover:shadow-coral/30 hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-white shadow-md hover:bg-destructive/90",
        outline:
          "border-2 border-border bg-white text-warm-gray hover:bg-cream hover:border-coral/30 hover:text-coral",
        secondary:
          "bg-cream text-warm-gray hover:bg-coral/10 hover:text-coral",
        ghost: "text-warm-gray hover:bg-coral/5 hover:text-coral",
        link: "text-coral underline-offset-4 hover:underline",
        teal: "bg-gradient-teal text-white shadow-md shadow-teal/25 hover:shadow-lg hover:shadow-teal/30 hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
