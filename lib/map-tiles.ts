type TileLayerConfig = {
  url: string
  attribution: string
  maxZoom?: number
}

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const MAPBOX_STYLE = "mapbox/light-v11"

// Get token from environment (client-side accessible)
function getMapboxToken(): string {
  if (typeof window !== "undefined") {
    // Client-side: token should be available via NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_TOKEN ?? ""
}

const MAPBOX_TOKEN = getMapboxToken()
const isDev = process.env.NODE_ENV !== "production"

if (!MAPBOX_TOKEN && isDev) {
  console.warn("[map-tiles] NEXT_PUBLIC_MAPBOX_TOKEN is missing, falling back to OpenStreetMap tiles.")
}

// Mapbox tile URL format for Leaflet: no {s} subdomains, @2x for retina
// Format: https://api.mapbox.com/styles/v1/{style}/tiles/{tilesize}/{z}/{x}/{y}{@2x}?access_token={token}
const MAPBOX_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : OSM_TILE_URL

const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'

export const mapTileLayerConfig: TileLayerConfig = MAPBOX_TOKEN
  ? {
      url: MAPBOX_TILE_URL,
      attribution: MAPBOX_ATTRIBUTION,
      maxZoom: 22,
    }
  : {
      url: OSM_TILE_URL,
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }

