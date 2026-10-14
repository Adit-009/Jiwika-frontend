import { useState, useCallback, useEffect } from "react";

type GeolocationState = {
  lat: number | null;
  lng: number | null;
  locationName: string;
  loading: boolean;
  error: string | null;
};

// Simple helper to load cached geolocation
const getCachedGeo = (): { lat: number; lng: number; name: string } | null => {
  try {
    const item = localStorage.getItem("jiwika_geo_cache");
    if (item) {
      const parsed = JSON.parse(item);
      // Cache valid for 24 hours
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore cache error
  }
  return null;
};

const setCachedGeo = (lat: number, lng: number, name: string) => {
  try {
    localStorage.setItem(
      "jiwika_geo_cache",
      JSON.stringify({
        timestamp: Date.now(),
        data: { lat, lng, name },
      }),
    );
  } catch (e) {
    // Ignore cache save error
  }
};

export function useGeolocation(enabled: boolean) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    locationName: "",
    loading: false,
    error: null,
  });

  const cached = typeof window !== "undefined" ? getCachedGeo() : null;

  // Invalidate cache entries that still have the old coordinate format
  const isCoordinateFormat = (name: string) => /^\d+\.\d+°[NS],\s*\d+\.\d+°[EW]$/.test(name);
  const validCached = cached && !isCoordinateFormat(cached.name) ? cached : null;

  useEffect(() => {
    if (validCached) {
      setState({
        lat: validCached.lat,
        lng: validCached.lng,
        locationName: validCached.name === "Your Location" ? "" : validCached.name,
        loading: false,
        error: null,
      });
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Start with a friendly fallback while reverse geocoding runs
        let locationName = "Your Location";

        // If coordinates are very close to cached coordinates AND cache has a real name, use it directly
        if (
          validCached &&
          validCached.name !== "Your Location" &&
          Math.abs(validCached.lat - latitude) < 0.01 &&
          Math.abs(validCached.lng - longitude) < 0.01
        ) {
          locationName = validCached.name;
          setState({
            lat: latitude,
            lng: longitude,
            locationName,
            loading: false,
            error: null,
          });
          return;
        }

        try {
          // Reverse geocode lookup via Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // Try to get the most specific local place name
            const place =
              addr.village ||
              addr.hamlet ||
              addr.neighbourhood ||
              addr.suburb ||
              addr.town ||
              addr.city ||
              addr.county ||
              "";

            // Get district from state_district
            const district = addr.state_district
              ? addr.state_district.replace(/\s*district\s*/i, "")
              : "";

            if (place && district) {
              locationName = `${place}, ${district}`;
            } else if (place) {
              locationName = place;
            } else if (district) {
              locationName = district;
            } else if (data.display_name) {
              // Use the first two parts of display_name as fallback
              const parts = data.display_name.split(",").map((s: string) => s.trim());
              locationName = parts.slice(0, 2).join(", ");
            }
          }
        } catch {
          // Fallback to cached or default
          if (validCached && validCached.name !== "Your Location") locationName = validCached.name;
        }

        setCachedGeo(latitude, longitude, locationName);
        setState({
          lat: latitude,
          lng: longitude,
          locationName,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        console.warn("[GEO HOOK] Error:", errorMsg, error);
        setState((s) => ({
          ...s,
          loading: false,
          error: errorMsg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [validCached]);

  useEffect(() => {
    if (enabled && state.lat === null && !state.loading && !state.error) {
      requestLocation();
    }
  }, [enabled, state.lat, state.loading, state.error, requestLocation]);

  return { ...state, retry: requestLocation };
}
