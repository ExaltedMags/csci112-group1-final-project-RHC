export type LatLng = { lat: number; lng: number };

const ORS_API_BASE = 'https://api.openrouteservice.org';

/**
 * Geocode a place name to coordinates using OpenRouteService
 * @param query Place name or address
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodePlace(query: string): Promise<LatLng | null> {
  const apiKey = process.env.ORS_API_KEY;
  
  if (!apiKey) {
    console.warn('ORS_API_KEY not found, geocoding will fail');
    return null;
  }

  try {
    const url = `${ORS_API_BASE}/geocode/search?text=${encodeURIComponent(query)}&boundary.country=PH&size=1`;
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`ORS geocoding failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn(`No geocoding results for: ${query}`);
      return null;
    }

    const [lng, lat] = data.features[0].geometry.coordinates;
    return { lat, lng };
  } catch (error) {
    console.error('Error geocoding place:', error);
    return null;
  }
}

/**
 * Get route between two coordinates using OpenRouteService
 * @param origin Starting coordinates
 * @param destination Ending coordinates
 * @returns Distance in km and duration in minutes, or null if routing fails
 */
export async function getRoute(
  origin: LatLng,
  destination: LatLng
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
  const apiKey = process.env.ORS_API_KEY;
  
  if (!apiKey) {
    console.warn('ORS_API_KEY not found, routing will fail');
    return null;
  }

  try {
    const url = `${ORS_API_BASE}/v2/directions/driving-car`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]],
      }),
    });

    if (!response.ok) {
      console.error(`ORS routing failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('No route found between coordinates');
      return null;
    }

    const route = data.routes[0];
    const summary = route.summary;
    
    // Convert distance from meters to kilometers
    const distanceKm = summary.distance / 1000;
    
    // Convert duration from seconds to minutes
    const durationMinutes = summary.duration / 60;

    return {
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      durationMinutes: Math.round(durationMinutes * 10) / 10, // Round to 1 decimal
    };
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}

