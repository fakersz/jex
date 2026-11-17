import { LocationCoordinates } from '../types/location';

export interface GeocodingResult {
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Realiza a geocodificação reversa gratuita usando o serviço Nominatim (OpenStreetMap).
 * Não requer chaves de API.
 */
export async function fetchReverseGeocode(coords: LocationCoordinates): Promise<GeocodingResult> {
  const { latitude, longitude } = coords;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const address = data?.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      address.county;

    const state = address.state_code ? address.state_code.toUpperCase() : address.state;

    if (city && state) {
      return {
        displayName: `${city}, ${state}`,
        city,
        state,
        country: address.country,
      };
    } else if (city) {
      return {
        displayName: city,
        city,
        country: address.country,
      };
    }

    return {
      displayName: 'Localização atual',
    };
  } catch (error) {
    console.warn('Falha na geocodificação reversa via OpenStreetMap Nominatim:', error);
    return {
      displayName: 'Localização atual',
    };
  }
}
