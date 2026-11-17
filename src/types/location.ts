export type LocationSource = 'automatic' | 'manual' | 'fallback';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPreferences {
  useAutomatic: boolean;
  manualCity: string;
  manualState: string;
}

export interface LocationState {
  displayName: string;
  source: LocationSource;
  coordinates: LocationCoordinates | null;
  isLoading: boolean;
  errorMessage: string | null;
  preferences: LocationPreferences;
}
