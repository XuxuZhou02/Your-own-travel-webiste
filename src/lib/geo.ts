import type { LatLng, Place } from "./types";

const EARTH_RADIUS_M = 6_371_000;
/** Average walking speed, about 4.8 km/h. */
const WALK_M_PER_MIN = 80;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_M_PER_MIN));
}

export interface NearbyPlace {
  place: Place;
  meters: number;
  walkMinutes: number;
}

/**
 * Places from this group's pool within the radius of a point (section 4.3),
 * sorted by distance and then by likes. Dropped places are left out.
 */
export function nearbyPlaces(
  origin: LatLng,
  pool: Place[],
  radius = 500,
  excludeIds: string[] = [],
): NearbyPlace[] {
  return pool
    .filter((p) => p.location && p.status !== "dropped" && !excludeIds.includes(p.id))
    .map((place) => {
      const meters = distanceMeters(origin, place.location!);
      return { place, meters, walkMinutes: walkingMinutes(meters) };
    })
    .filter((n) => n.meters <= radius)
    .sort((a, b) => {
      const byDistance = Math.round(a.meters / 50) - Math.round(b.meters / 50);
      return byDistance !== 0 ? byDistance : b.place.likes.length - a.place.likes.length;
    });
}
