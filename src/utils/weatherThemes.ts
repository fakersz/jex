export interface WeatherTheme {
  gradient: string;
  accentColor: string;
  icon: string;
}

export function getWeatherTheme(condition: string): WeatherTheme {
  const condLower = (condition || '').toLowerCase();

  if (condLower.includes('sol') || condLower.includes('limpo') || condLower.includes('ensolarado')) {
    return {
      gradient: 'linear-gradient(135deg, #0284c7 0%, #f59e0b 100%)',
      accentColor: '#f59e0b',
      icon: '☀️',
    };
  }

  if (condLower.includes('chuva') || condLower.includes('tempestade') || condLower.includes('garoa')) {
    return {
      gradient: 'linear-gradient(135deg, #1e293b 0%, #0284c7 100%)',
      accentColor: '#38bdf8',
      icon: '🌧️',
    };
  }

  if (condLower.includes('noite')) {
    return {
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #09090b 100%)',
      accentColor: '#818cf8',
      icon: '🌙',
    };
  }

  return {
    gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
    accentColor: '#38bdf8',
    icon: '🌤️',
  };
}
