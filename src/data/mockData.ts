import { WeatherData, NowPlayingData, AlarmItem, TimerItem, CalendarEvent, AssistantState } from '../types';

export const mockWeatherData: WeatherData = {
  city: 'São Paulo, SP',
  temperature: 24,
  condition: 'Parcialmente Nublado',
  humidity: 62,
  windSpeedKmH: 14,
  tempHigh: 27,
  tempLow: 18,
  uvIndex: 5,
};

export const mockNowPlayingData: NowPlayingData = {
  title: 'Cyberpunk Synthwave Horizons',
  artist: 'Neon Wave Orchestra',
  album: 'Future Echoes 2088',
  durationSeconds: 225,
  progressSeconds: 98,
  isPlaying: true,
  coverGradient: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)',
};

export const mockAlarms: AlarmItem[] = [
  {
    id: '1',
    time: '07:00',
    label: 'Despertar Matinal',
    days: 'Seg - Sex',
    active: true,
  },
  {
    id: '2',
    time: '08:30',
    label: 'Reunião de Alinhamento',
    days: 'Hoje',
    active: true,
  },
  {
    id: '3',
    time: '19:00',
    label: 'Treino de Corrida',
    days: 'Ter, Qui, Sáb',
    active: false,
  },
];

export const mockTimers: TimerItem[] = [
  {
    id: '1',
    label: 'Foco Pomodoro',
    totalSeconds: 1500,
    remainingSeconds: 840,
    active: true,
  },
  {
    id: '2',
    label: 'Forno Elétrico',
    totalSeconds: 900,
    remainingSeconds: 180,
    active: true,
  },
];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Review de Arquitetura JEX',
    time: '10:00 - 11:00',
    duration: '1 hora',
    location: 'Sala Virtual JEX',
    category: 'Trabalho',
    categoryColor: '#00f2fe',
  },
  {
    id: '2',
    title: 'Almoço de Equipe',
    time: '12:30 - 13:30',
    duration: '1 hora',
    category: 'Pessoal',
    categoryColor: '#4facfe',
  },
  {
    id: '3',
    title: 'Sincronização de Módulos',
    time: '15:00 - 16:00',
    duration: '1 hora',
    location: 'Docker Cluster',
    category: 'Reunião',
    categoryColor: '#a855f7',
  },
];

export const stateMessages: Record<AssistantState, { label: string; detail: string; statusColor: string }> = {
  available: {
    label: 'Disponível',
    detail: 'Olá! Sou o JEX. Como posso ajudar você hoje?',
    statusColor: '#10b981', // green
  },
  listening: {
    label: 'Ouvindo...',
    detail: 'Pode falar. Estou escutando seu comando...',
    statusColor: '#3b82f6', // blue
  },
  processing: {
    label: 'Processando',
    detail: 'Analisando os dados e gerando resposta...',
    statusColor: '#f59e0b', // amber
  },
  responding: {
    label: 'Respondendo',
    detail: 'Tenho aqui as informações solicitadas para o seu dia.',
    statusColor: '#a855f7', // purple
  },
};
