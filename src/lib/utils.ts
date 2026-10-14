import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidCoordinate(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) {
    return false;
  }
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
    return false;
  }
  // 0,0 is Null Island (invalid for land locations)
  if (Math.abs(nLat) < 0.00001 && Math.abs(nLng) < 0.00001) {
    return false;
  }
  return true;
}

/**
 * Reusable Haversine Distance Utility
 * Standardized Order: (lat1, lng1, lat2, lng2)
 * Returns distance in KM rounded to 1 decimal place, or null if invalid coordinates.
 */
export function calculateDistance(
  lat1: number | string | null | undefined,
  lng1: number | string | null | undefined,
  lat2: number | string | null | undefined,
  lng2: number | string | null | undefined,
): number | null {
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLng1 = Number(lng1);
  const nLat2 = Number(lat2);
  const nLng2 = Number(lng2);

  const R = 6371; // Earth's radius in km
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLng = (nLng2 - nLng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

export async function getDrivingDistance(
  lat1: number | string | null | undefined,
  lng1: number | string | null | undefined,
  lat2: number | string | null | undefined,
  lng2: number | string | null | undefined,
): Promise<number | null> {
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLng1 = Number(lng1);
  const nLat2 = Number(lat2);
  const nLng2 = Number(lng2);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://router.project-osrm.org/route/v1/driving/${nLng1},${nLat1};${nLng2},${nLat2}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const meters = data.routes[0].distance;
        const km = meters / 1000;
        return Math.round(km * 10) / 10;
      }
    }
  } catch {
    // Fallback to Haversine
  }

  return calculateDistance(nLat1, nLng1, nLat2, nLng2);
}

export function getDistance(
  lat1: number | string | null | undefined,
  lng1: number | string | null | undefined,
  lat2: number | string | null | undefined,
  lng2: number | string | null | undefined,
): number | null {
  return calculateDistance(lat1, lng1, lat2, lng2);
}
