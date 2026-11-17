import { useState, useEffect, useCallback } from 'react';
import {
  LocationState,
  LocationPreferences,
  LocationCoordinates,
} from '../types/location';
import { fetchReverseGeocode } from '../utils/geocoding';

const STORAGE_KEY = 'jex_location_preferences';

const DEFAULT_PREFERENCES: LocationPreferences = {
  useAutomatic: true,
  manualCity: '',
  manualState: '',
};

const FALLBACK_DISPLAY_NAME = 'São Paulo, SP';

export interface UseLocationReturn extends LocationState {
  savePreferences: (newPrefs: LocationPreferences) => void;
  clearManualLocation: () => void;
  retryGeolocation: () => void;
}

export function useLocation(): UseLocationReturn {
  const [preferences, setPreferences] = useState<LocationPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Falha ao ler preferências de localização do localStorage:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  const [locationState, setLocationState] = useState<Omit<LocationState, 'preferences'>>({
    displayName: FALLBACK_DISPLAY_NAME,
    source: 'fallback',
    coordinates: null,
    isLoading: false,
    errorMessage: null,
  });

  const requestBrowserGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState({
        displayName: FALLBACK_DISPLAY_NAME,
        source: 'fallback',
        coordinates: null,
        isLoading: false,
        errorMessage: 'Geolocalização não é suportada por este navegador.',
      });
      return;
    }

    setLocationState((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: null,
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Realiza a geocodificação reversa usando OpenStreetMap Nominatim gratuito
        const geoResult = await fetchReverseGeocode(coords);

        setLocationState({
          displayName: geoResult.displayName,
          source: 'automatic',
          coordinates: coords,
          isLoading: false,
          errorMessage: null,
        });
      },
      (error) => {
        let msg = 'Não foi possível obter sua localização.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permissão de localização negada pelo usuário.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tempo limite esgotado ao buscar localização.';
        }
        setLocationState({
          displayName: FALLBACK_DISPLAY_NAME,
          source: 'fallback',
          coordinates: null,
          isLoading: false,
          errorMessage: msg,
        });
      },
      {
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }, []);

  const resolveLocation = useCallback(() => {
    // 1. Manual check
    if (!preferences.useAutomatic && preferences.manualCity.trim()) {
      const city = preferences.manualCity.trim();
      const state = preferences.manualState.trim();
      const name = state ? `${city}, ${state}` : city;

      setLocationState({
        displayName: name,
        source: 'manual',
        coordinates: null,
        isLoading: false,
        errorMessage: null,
      });
      return;
    }

    // 2. Automatic check
    if (preferences.useAutomatic) {
      requestBrowserGeolocation();
      return;
    }

    // 3. Fallback
    setLocationState({
      displayName: FALLBACK_DISPLAY_NAME,
      source: 'fallback',
      coordinates: null,
      isLoading: false,
      errorMessage: null,
    });
  }, [preferences, requestBrowserGeolocation]);

  useEffect(() => {
    resolveLocation();
  }, [resolveLocation]);

  const savePreferences = (newPrefs: LocationPreferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.warn('Erro ao salvar localização no localStorage:', e);
    }
  };

  const clearManualLocation = () => {
    const updated: LocationPreferences = {
      useAutomatic: true,
      manualCity: '',
      manualState: '',
    };
    savePreferences(updated);
  };

  const retryGeolocation = () => {
    if (preferences.useAutomatic) {
      requestBrowserGeolocation();
    } else {
      // If manual mode, switch to automatic to retry
      const updated = { ...preferences, useAutomatic: true };
      savePreferences(updated);
    }
  };

  return {
    ...locationState,
    preferences,
    savePreferences,
    clearManualLocation,
    retryGeolocation,
  };
}
