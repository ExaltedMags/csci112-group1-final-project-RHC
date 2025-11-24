import { Bike, Car } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface ProviderThemeConfig {
  accent: string
  hover: string
  text: string
  bg: string
  mapColor: string
  icon: LucideIcon
}

export const PROVIDER_THEME: Record<string, ProviderThemeConfig> = {
  GrabPH: {
    accent: "bg-green-600",
    hover: "hover:bg-green-700",
    text: "text-green-600",
    bg: "bg-green-50",
    mapColor: "#16a34a",
    icon: Car,
  },
  JoyRideMC: {
    accent: "bg-indigo-600",
    hover: "hover:bg-indigo-700",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    mapColor: "#4f46e5",
    icon: Bike,
  },
  Angkas: {
    accent: "bg-cyan-600",
    hover: "hover:bg-cyan-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
    mapColor: "#0891b2",
    icon: Bike,
  },
  default: {
    accent: "bg-slate-900",
    hover: "hover:bg-slate-800",
    text: "text-slate-900",
    bg: "bg-slate-50",
    mapColor: "#0f172a",
    icon: Car,
  },
}

export function getProviderTheme(providerId: string) {
  return PROVIDER_THEME[providerId] || PROVIDER_THEME.default
}


