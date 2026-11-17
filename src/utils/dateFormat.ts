/**
  * Formata a data atual em português brasileiro de forma natural.
  * Exemplo: "Domingo, 2 de agosto de 2026"
  */
export function formatFullDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatted = formatter.format(date);
  // Capitaliza apenas a primeira letra do dia da semana
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
  * Formata a hora em formato 24h (HH:mm:ss).
  * Exemplo: "20:36:45"
  */
export function formatTime24h(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
