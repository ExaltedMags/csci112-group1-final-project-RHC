import mbxGeocoding, { GeocodeFeature } from '@mapbox/mapbox-sdk/services/geocoding';

export interface PlaceSuggestion {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

const mapboxToken = process.env.MAPBOX_TOKEN;

if (!mapboxToken) {
  console.warn('[mapbox] MAPBOX_TOKEN is not configured. Place search will be disabled.');
}

const geocodingClient = mapboxToken
  ? mbxGeocoding({ accessToken: mapboxToken })
  : null;

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery || !geocodingClient) {
    return [];
  }

  try {
    const response = await geocodingClient
      .forwardGeocode({
        query: trimmedQuery,
        countries: ['ph'],
        limit: 5,
        autocomplete: true,
        types: ['address', 'place', 'poi', 'locality', 'neighborhood'],
      })
      .send();

    const features: GeocodeFeature[] = response.body?.features ?? [];

    return features
      .map((feature) => {
        const [lng, lat] = feature.center ?? [];

        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        return {
          id: feature.id,
          label: feature.text ?? feature.place_name ?? trimmedQuery,
          address: feature.place_name ?? feature.text ?? trimmedQuery,
          lat,
          lng,
        } satisfies PlaceSuggestion;
      })
      .filter((feature): feature is PlaceSuggestion => Boolean(feature));
  } catch (error) {
    console.error('[mapbox] Failed to search places:', error);
    return [];
  }
}


