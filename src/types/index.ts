export * from './assistant';
export * from './location';

export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeedKmH: number;
  tempHigh: number;
  tempLow: number;
  uvIndex: number;
}

export interface NowPlayingData {
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  progressSeconds: number;
  isPlaying: boolean;
  coverGradient: string;
}

export interface AlarmItem {
  id: string;
  time: string;
  label: string;
  days: string | string[];
  active: boolean;
  enabled?: boolean;
}

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  durationSeconds?: number;
  remainingSeconds: number;
  active: boolean;
  isRunning?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: string;
  location?: string;
  category: 'Trabalho' | 'Pessoal' | 'Saúde' | 'Reunião';
  categoryColor: string;
}
