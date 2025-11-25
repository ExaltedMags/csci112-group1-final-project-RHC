import Image from "next/image"
import { Car } from "lucide-react"

import type { ProviderThemeConfig } from "@/lib/provider-theme"
import { cn } from "@/lib/utils"

interface ProviderLogoProps {
  theme: ProviderThemeConfig
  size?: number
  className?: string
  iconClassName?: string
}

export function ProviderLogo({
  theme,
  size = 32,
  className,
  iconClassName,
}: ProviderLogoProps) {
  if (theme.logoSrc) {
    return (
      <Image
        src={theme.logoSrc}
        alt={theme.logoAlt ?? "Provider logo"}
        width={size}
        height={size}
        className={cn("object-contain", className)}
        priority={false}
      />
    )
  }

  const Icon = theme.icon ?? Car
  return <Icon className={cn(iconClassName, className)} aria-hidden="true" />
}

