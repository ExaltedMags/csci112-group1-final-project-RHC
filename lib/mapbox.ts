import { randomUUID } from 'node:crypto';
import mbxGeocoding, {
  GeocodeFeature,
  GeocodeQueryType,
} from '@mapbox/mapbox-sdk/services/geocoding';

export interface PlaceSuggestion {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

const mapboxToken = process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const isDev = process.env.NODE_ENV !== 'production';

if (!mapboxToken) {
  if (isDev) {
    console.warn('[mapbox] MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN is not configured. Place search will be disabled.');
  }
}

const geocodingClient = mapboxToken
  ? mbxGeocoding({ accessToken: mapboxToken })
  : null;

const DEFAULT_COUNTRIES = ['ph'];
const DEFAULT_TYPES: ReadonlyArray<GeocodeQueryType> = [
  'poi.landmark',
  'poi',
  'place',
  'locality',
  'neighborhood',
  'district',
  'region',
  'address',
] as const;
const DEFAULT_LANGUAGES: ReadonlyArray<string> = ['en', 'tl'];
const MAX_RESULTS = 8;
const SEARCHBOX_BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';
const SEARCHBOX_TYPES = ['poi', 'place', 'locality', 'neighborhood', 'address'];
const SEARCHBOX_PROXIMITY: [number, number] = [121.0568, 14.5995]; // Metro Manila bias
const MAPBOX_DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5';

type BasicLatLng = {
  lat: number;
  lng: number;
};

const PLACE_TYPE_PRIORITY = new Map<string, number>(
  DEFAULT_TYPES.map((type, index) => [type, index]),
);

function getPlaceTypePriority(feature: GeocodeFeature) {
  const type = feature.place_type?.[0];
  if (!type) {
    return DEFAULT_TYPES.length;
  }

  return PLACE_TYPE_PRIORITY.get(type) ?? DEFAULT_TYPES.length;
}

type SearchBoxSuggestion = {
  name?: string;
  mapbox_id?: string;
  full_address?: string;
  place_formatted?: string;
  address?: string;
};

type SearchBoxFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
  };
};

async function fetchSearchBoxSuggestions(
  query: string,
): Promise<{ suggestions: SearchBoxSuggestion[]; sessionToken: string }> {
  if (!mapboxToken) {
    return { suggestions: [], sessionToken: '' };
  }

  const sessionToken = randomUUID();
  const params = new URLSearchParams({
    q: query,
    session_token: sessionToken,
    limit: String(MAX_RESULTS),
    country: DEFAULT_COUNTRIES.map((code) => code.toUpperCase()).join(','),
    language: DEFAULT_LANGUAGES.join(','),
    types: SEARCHBOX_TYPES.join(','),
    proximity: SEARCHBOX_PROXIMITY.join(','),
  });

  const response = await fetch(
    `${SEARCHBOX_BASE_URL}/suggest?${params.toString()}&access_token=${mapboxToken}`,
  );

  if (!response.ok) {
    throw new Error(
      `[mapbox] Search Box suggest failed (${response.status}): ${await response.text()}`,
    );
  }

  const data = await response.json();
  const suggestions: SearchBoxSuggestion[] = Array.isArray(data?.suggestions)
    ? data.suggestions
    : [];

  return { suggestions, sessionToken };
}

async function fetchSearchBoxRetrieve(
  mapboxId: string,
  sessionToken: string,
): Promise<SearchBoxFeature | null> {
  if (!mapboxToken) {
    return null;
  }

  const url = new URL(`${SEARCHBOX_BASE_URL}/retrieve/${encodeURIComponent(mapboxId)}`);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('access_token', mapboxToken);

  const response = await fetch(url);

  if (!response.ok) {
    console.warn(
      `[mapbox] Search Box retrieve failed for ${mapboxId} (${response.status}): ${await response.text()}`,
    );
    return null;
  }

  const data = await response.json();
  const feature: SearchBoxFeature | undefined = data?.features?.[0];

  return feature ?? null;
}

async function searchWithSearchBox(trimmedQuery: string): Promise<PlaceSuggestion[]> {
  if (!mapboxToken) {
    if (isDev) {
      console.warn('[mapbox] Search Box lookup skipped: MAPBOX_TOKEN not configured');
    }
    return [];
  }

  try {
    const { suggestions, sessionToken } = await fetchSearchBoxSuggestions(trimmedQuery);

    if (!suggestions.length) {
      return [];
    }

    const detailed = await Promise.all(
      suggestions.map(async (suggestion) => {
        const mapboxId = suggestion.mapbox_id;
        if (!mapboxId) {
          return null;
        }

        const feature = await fetchSearchBoxRetrieve(mapboxId, sessionToken);
        const [lng, lat] = feature?.geometry?.coordinates ?? [];

        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        const address =
          suggestion.full_address ??
          suggestion.place_formatted ??
          feature?.properties?.full_address ??
          feature?.properties?.place_formatted ??
          suggestion.address ??
          suggestion.name ??
          trimmedQuery;

        return {
          id: mapboxId,
          label: suggestion.name ?? feature?.properties?.name ?? address,
          address,
          lat,
          lng,
        } satisfies PlaceSuggestion;
      }),
    );

    return detailed.filter((item): item is PlaceSuggestion => Boolean(item));
  } catch (error) {
    if (isDev) {
      console.warn('[mapbox] Search Box lookup failed, falling back to geocoder:', error);
    }
    // Return empty to trigger fallback to geocoder
    return [];
  }
}

async function searchWithForwardGeocode(trimmedQuery: string): Promise<PlaceSuggestion[]> {
  if (!geocodingClient) {
    return [];
  }

  try {
    const response = await geocodingClient
      .forwardGeocode({
        mode: 'mapbox.places',
        query: trimmedQuery,
        countries: DEFAULT_COUNTRIES,
        limit: MAX_RESULTS,
        autocomplete: true,
        language: [...DEFAULT_LANGUAGES],
        types: [...DEFAULT_TYPES],
      })
      .send();

    const features: GeocodeFeature[] = response.body?.features ?? [];

    if (!features.length) {
      return [];
    }

    const prioritized = [...features].sort((a, b) => {
      const priorityDiff = getPlaceTypePriority(a) - getPlaceTypePriority(b);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const relevanceDiff = (b.relevance ?? 0) - (a.relevance ?? 0);
      if (relevanceDiff !== 0) {
        return relevanceDiff;
      }

      return (a.place_name ?? '').localeCompare(b.place_name ?? '');
    });

    return prioritized
      .map((feature) => {
        const [lng, lat] = feature.center ?? [];

        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        const address = feature.place_name ?? feature.text ?? trimmedQuery;

        return {
          id: feature.id,
          label: feature.text ?? address,
          address,
          lat,
          lng,
        } satisfies PlaceSuggestion;
      })
      .filter((feature): feature is PlaceSuggestion => Boolean(feature));
  } catch (error) {
    console.error('[mapbox] Failed to search places via geocoder:', error);
    return [];
  }
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  // Try SearchBox API first (better results)
  const searchBoxResults = await searchWithSearchBox(trimmedQuery);

  if (searchBoxResults.length > 0) {
    return searchBoxResults;
  }

  // Fallback to forward geocoding if SearchBox returns no results
  const geocodeResults = await searchWithForwardGeocode(trimmedQuery);
  
  if (geocodeResults.length > 0) {
    return geocodeResults;
  }

  // If both fail and we're in dev, log a warning
  if (isDev) {
    console.warn(`[mapbox] No results found for "${trimmedQuery}" via SearchBox or Geocoder`);
  }

  return [];
}

export type GeocodedPlace = {
  lat: number;
  lng: number;
  label: string;
};

const FORWARD_GEOCODE_LIMIT = 1;

export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return null;
  }

  if (!geocodingClient) {
    if (isDev) {
      console.warn('[mapbox] Forward geocoding requested but MAPBOX token is missing.');
    }
    return null;
  }

  try {
    const response = await geocodingClient
      .forwardGeocode({
        mode: 'mapbox.places',
        query: trimmedQuery,
        countries: DEFAULT_COUNTRIES,
        limit: FORWARD_GEOCODE_LIMIT,
        language: [...DEFAULT_LANGUAGES],
        types: [...DEFAULT_TYPES],
        autocomplete: true,
        proximity: SEARCHBOX_PROXIMITY,
      })
      .send();

    const feature: GeocodeFeature | undefined = response.body?.features?.[0];

    if (!feature) {
      if (isDev) {
        console.warn(`[mapbox] No forward geocode match for "${trimmedQuery}"`);
      }
      return null;
    }

    const [lng, lat] = feature.center ?? [];

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      if (isDev) {
        console.warn(`[mapbox] Geocode response lacked coordinates for "${trimmedQuery}"`);
      }
      return null;
    }

    const label = feature.text ?? feature.place_name ?? trimmedQuery;

    return { lat, lng, label };
  } catch (error) {
    if (isDev) {
      console.warn('[mapbox] Forward geocode failed:', error);
    }
    return null;
  }
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export type MapboxRouteResult = {
  distanceKm: number;
  durationMinutes: number;
  geometry: BasicLatLng[];
};

export async function getMapboxRoute(
  origin: BasicLatLng,
  destination: BasicLatLng
): Promise<MapboxRouteResult | null> {
  if (!mapboxToken) {
    if (isDev) {
      console.warn('[mapbox] Directions requested but MAPBOX token is missing.');
    }
    return null;
  }

  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = new URL(`${MAPBOX_DIRECTIONS_BASE}/mapbox/driving/${coords}`);
    url.searchParams.set('access_token', mapboxToken);
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('overview', 'full');
    url.searchParams.set('steps', 'false');
    url.searchParams.set('alternatives', 'false');

    const response = await fetch(url);

    if (!response.ok) {
      if (isDev) {
        console.warn(`[mapbox] Directions failed (${response.status}): ${await response.text()}`);
      }
      return null;
    }

    const data = await response.json();
    const route = data.routes?.[0];
    const coordsArray: [number, number][] | undefined = route?.geometry?.coordinates;

    if (!route || !Array.isArray(coordsArray) || coordsArray.length < 2) {
      if (isDev) {
        console.warn('[mapbox] Directions response missing geometry');
      }
      return null;
    }

    const geometry = coordsArray
      .filter(
        (pair): pair is [number, number] =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          typeof pair[0] === 'number' &&
          typeof pair[1] === 'number'
      )
      .map(([lng, lat]) => ({ lat, lng }));

    if (geometry.length < 2) {
      return null;
    }

    const distanceKm = roundToSingleDecimal((route.distance ?? 0) / 1000);
    const durationMinutes = roundToSingleDecimal((route.duration ?? 0) / 60);

    return {
      distanceKm,
      durationMinutes,
      geometry,
    };
  } catch (error) {
    console.error('[mapbox] Directions exception:', error);
    return null;
  }
}


