import { Bike, Car } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface ProviderThemeConfig {
  accent: string
  hover: string
  text: string
  bg: string
  mapColor: string
  icon?: LucideIcon
  logoSrc?: string
  logoAlt?: string
}

export const PROVIDER_THEME: Record<string, ProviderThemeConfig> = {
  GrabPH: {
    accent: "bg-emerald-500",
    hover: "hover:bg-emerald-600",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    mapColor: "#00B14F",
    icon: Car,
    logoSrc: "/provider-logos/grab.svg",
    logoAlt: "GrabPH logo",
  },
  JoyRideMC: {
    accent: "bg-indigo-500",
    hover: "hover:bg-indigo-600",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    mapColor: "#6366F1",
    icon: Bike,
    logoSrc: "/provider-logos/joyridemc.png",
    logoAlt: "JoyRideMC logo",
  },
  Angkas: {
    accent: "bg-cyan-600",
    hover: "hover:bg-cyan-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
    mapColor: "#0891b2",
    icon: Bike,
    logoSrc: "/provider-logos/angkas.png",
    logoAlt: "Angkas logo",
  },
  default: {
    accent: "bg-warm-gray",
    hover: "hover:bg-warm-gray/90",
    text: "text-warm-gray",
    bg: "bg-cream",
    mapColor: "#44403C",
    icon: Car,
  },
}

export function getProviderTheme(providerId: string) {
  return PROVIDER_THEME[providerId] || PROVIDER_THEME.default
}
