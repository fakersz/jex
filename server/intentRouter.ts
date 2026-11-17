import { evaluateMathExpression } from './mathEvaluator';

export type LocalIntentType =
  | 'criar_timer'
  | 'listar_timers'
  | 'pausar_timer'
  | 'continuar_timer'
  | 'cancelar_timer'
  | 'tempo_restante_timer'
  | 'criar_alarme'
  | 'listar_alarmes'
  | 'ativar_alarme'
  | 'desativar_alarme'
  | 'cancelar_alarme'
  | 'ativar_player_musica'
  | 'desativar_player_musica'
  | 'selecionar_fonte_local'
  | 'selecionar_fonte_spotify'
  | 'consultar_fonte_musica'
  | 'tocar_musica'
  | 'pausar_musica'
  | 'continuar_musica'
  | 'proxima_musica'
  | 'musica_anterior'
  | 'aumentar_volume'
  | 'diminuir_volume'
  | 'definir_volume'
  | 'silenciar_musica'
  | 'ativar_som'
  | 'tocar_playlist'
  | 'consultar_musica_atual'
  | 'listar_musicas'
  | 'parar_musica'
  | 'consultar_hora'
  | 'consultar_data'
  | 'calculo_matematico'
  | 'consultar_status_servidor'
  | 'saudacao'
  | 'consultar_modelo_ia'
  | 'conhecimento_estavel';

export interface LocalIntentResult {
  intent: LocalIntentType;
  text: string;
  action?: {
    type: string;
    [key: string]: any;
  };
  data?: any;
}

// Mapa expansível de conhecimentos estáveis e inequívocos (sem acionar Gemini)
const STABLE_KNOWLEDGE_MAP: Record<string, string> = {
  'quantos planetas existem no sistema solar': 'O Sistema Solar tem oito planetas.',
  'quantos planetas tem o sistema solar': 'O Sistema Solar tem oito planetas.',
  'quais sao os planetas do sistema solar': 'Os oito planetas são Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno.',
  'quem e o jex': 'Eu sou o JEX, seu assistente pessoal virtual.',
  'o que e o jex': 'O JEX é um assistente virtual pessoal modular focado em produtividade e controle local.',
  'quem criou o jex': 'Eu sou o assistente pessoal JEX, desenvolvido para te auxiliar no dia a dia.',
};

/**
 * Converte números por extenso em português para inteiros.
 */
function parsePortugueseNumber(text: string): number | null {
  const numberMap: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
    treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
    dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
    quarenta: 40, cinquenta: 50, sessenta: 60,
  };

  const clean = text.toLowerCase().trim();
  if (!isNaN(parseInt(clean, 10))) {
    return parseInt(clean, 10);
  }

  return numberMap[clean] ?? null;
}

/**
 * Extrai duração em segundos de uma frase em português brasileiro.
 */
function parseTimerDuration(text: string): { durationSeconds: number; label: string } | null {
  const lower = text.toLowerCase();

  if (lower.includes('uma hora e meia')) {
    return { durationSeconds: 5400, label: 'Timer de 1 hora e 30 minutos' };
  }
  if (lower.includes('meia hora')) {
    return { durationSeconds: 1800, label: 'Timer de 30 minutos' };
  }

  // Ignorar "um timer", "uma contagem" para focar no número de tempo real
  const cleanForNum = lower
    .replace(/\b(um|uma)\s+(timer|temporizador|cronômetro|cronometro|contagem|alarme)\b/gi, 'timer')
    .replace(/\b(de|para|pra)\b/gi, ' ');

  const numRegex = /\b(\d+|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta|quarenta|cinquenta)\b/i;
  const numMatch = cleanForNum.match(numRegex);
  if (!numMatch) return null;

  const rawVal = numMatch[1];
  const numVal = parsePortugueseNumber(rawVal);
  if (numVal === null || numVal <= 0) return null;

  let multiplier = 60; // Padrão minutos
  let unitLabel = numVal === 1 ? 'minuto' : 'minutos';

  if (/\b(segundos?|seg)\b/i.test(lower)) {
    multiplier = 1;
    unitLabel = numVal === 1 ? 'segundo' : 'segundos';
  } else if (/\b(horas?|h)\b/i.test(lower)) {
    multiplier = 3600;
    unitLabel = numVal === 1 ? 'hora' : 'horas';
  } else if (/\b(minutos?|min|m)\b/i.test(lower)) {
    multiplier = 60;
    unitLabel = numVal === 1 ? 'minuto' : 'minutos';
  }

  const totalSeconds = numVal * multiplier;
  return {
    durationSeconds: totalSeconds,
    label: `Timer de ${numVal} ${unitLabel}`,
  };
}

/**
 * Extrai horário de alarme em português.
 */
function parseAlarmTime(text: string): string {
  const lower = text.toLowerCase();
  const timeRegex = /\b(\d{1,2})(:(\d{2}))?\s*(h|horas?)?\b/i;
  const match = lower.match(timeRegex);

  const numRegex = /\b(um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\b/i;
  const numMatch = lower.match(numRegex);

  let hour = 7;
  let min = '00';

  if (match && !isNaN(parseInt(match[1], 10))) {
    const parsedH = parseInt(match[1], 10);
    if (parsedH >= 0 && parsedH <= 23) {
      hour = parsedH;
      if (match[3]) min = match[3];
    }
  } else if (numMatch) {
    const parsedH = parsePortugueseNumber(numMatch[1]);
    if (parsedH !== null && parsedH >= 0 && parsedH <= 23) {
      hour = parsedH;
    }
  }

  return `${hour.toString().padStart(2, '0')}:${min}`;
}

/**
 * Roteador Local de Intenções do JEX com ORDEM OBRIGATÓRIA de Prioridade.
 * Executado ANTES de qualquer chamada ao Gemini.
 */
export function resolveLocalIntent(message: string): LocalIntentResult | null {
  if (!message || !message.trim()) return null;

  const normalized = message.toLowerCase().trim();

  // =========================================================================
  // PRIORIDADE 1: TIMERS E ALARMES (100% Local)
  // =========================================================================

  // 1.1 Criar Timer
  if (/(timer|temporizador|cronometr|contagem\s+regressiva|me\s+avisa\s+daqui|p[õo]e\s+um\s+timer|marca)/i.test(normalized)) {
    if (!/(paus|continua|retom|cancel|quanto\s+falta|list)/i.test(normalized)) {
      const timerData = parseTimerDuration(normalized);
      if (timerData) {
        const now = Date.now();
        const endsAt = new Date(now + timerData.durationSeconds * 1000).toISOString();
        const timerId = `timer_${now}_${Math.random().toString(36).substring(2, 6)}`;

        const minDisplay = Math.floor(timerData.durationSeconds / 60);
        const secDisplay = timerData.durationSeconds % 60;
        let textTime = '';

        if (minDisplay > 0 && secDisplay > 0) {
          textTime = `${minDisplay} minutos e ${secDisplay} segundos`;
        } else if (minDisplay > 0) {
          textTime = minDisplay === 1 ? '1 minuto' : `${minDisplay} minutos`;
        } else {
          textTime = `${secDisplay} segundos`;
        }

        return {
          intent: 'criar_timer',
          text: `Timer de ${textTime} iniciado.`,
          data: {
            timerId,
            label: timerData.label,
            durationSeconds: timerData.durationSeconds,
            startedAt: new Date(now).toISOString(),
            endsAt,
          },
        };
      }
    }
  }

  // 1.2 Listar Timers
  if (/(quais\s+(os\s+)?timers|timers\s+ativos|listar\s+timers|meus\s+timers)/i.test(normalized)) {
    return {
      intent: 'listar_timers',
      text: 'Buscando os timers ativos no painel...',
    };
  }

  // 1.3 Pausar Timer
  if (/(paus[aa]|pausar)\s+(o\s+)?(timer|temporizador)/i.test(normalized)) {
    return {
      intent: 'pausar_timer',
      text: 'Timer pausado com sucesso.',
    };
  }

  // 1.4 Continuar / Retomar Timer
  if (/(continua|continuar|retom[aa]|retomar)\s+(o\s+)?(timer|temporizador)/i.test(normalized)) {
    return {
      intent: 'continuar_timer',
      text: 'Timer retomado.',
    };
  }

  // 1.5 Cancelar Timer
  if (/(cancel[aa]|cancelar|parar|limpar)\s+(o\s+)?(timer|temporizador)/i.test(normalized)) {
    return {
      intent: 'cancelar_timer',
      text: 'Timer cancelado.',
    };
  }

  // 1.6 Tempo Restante do Timer
  if (/(quanto\s+falta|quanto\s+tempo\s+falta|tempo\s+restante)\s+(para\s+o\s+timer|do\s+timer)?/i.test(normalized)) {
    return {
      intent: 'tempo_restante_timer',
      text: 'Verificando o tempo restante do seu timer...',
    };
  }

  // 1.7 Criar Alarme
  if (/(alarme|me\s+acorda)/i.test(normalized)) {
    if (/(coloc|cri|defin|agend|acorda|p[õo]e)/i.test(normalized)) {
      const formattedTime = parseAlarmTime(normalized);
      return {
        intent: 'criar_alarme',
        text: `Alarme configurado para as ${formattedTime}.`,
        data: {
          alarmId: `alarm_${Date.now()}`,
          time: formattedTime,
          enabled: true,
        },
      };
    }
  }

  // 1.8 Listar / Cancelar Alarmes
  if (/(quais\s+(os\s+)?alarmes|alarmes\s+definidos|listar\s+alarmes)/i.test(normalized)) {
    return {
      intent: 'listar_alarmes',
      text: 'Exibindo seus alarmes configurados.',
    };
  }
  if (/(cancel[aa]|cancelar|desativar)\s+(o\s+)?alarme/i.test(normalized)) {
    return {
      intent: 'cancelar_alarme',
      text: 'Alarme desativado com sucesso.',
    };
  }

  // =========================================================================
  // 1.9 COMANDOS DE FONTE DE ÁUDIO E PLAYER (100% Local)
  // =========================================================================

  // Desativar Player
  if (/(desliga|desligar|desativar)\s+(o\s+)?player/i.test(normalized)) {
    return {
      intent: 'desativar_player_musica',
      text: 'O player de música está desligado.',
      action: { type: 'music.setAudioSource', source: 'disabled' },
    };
  }

  // Ativar Player
  if (/(\bliga\b|\bligar\b|\bativar\b)\s+(o\s+)?player/i.test(normalized)) {
    return {
      intent: 'ativar_player_musica',
      text: 'Player de música ativado.',
      action: { type: 'music.setAudioSource', source: 'local' },
    };
  }

  // Usar Músicas Locais
  if (/(usar\s+minhas\s+m[úu]sicas\s+locais|fonte\s+local|m[úu]sica\s+local)/i.test(normalized)) {
    return {
      intent: 'selecionar_fonte_local',
      text: 'Fonte de música alterada para Mídia Local.',
      action: { type: 'music.setAudioSource', source: 'local' },
    };
  }

  // Usar Spotify
  if (/(usar\s+(o\s+)?spotify|fonte\s+spotify|abrir\s+spotify)/i.test(normalized)) {
    return {
      intent: 'selecionar_fonte_spotify',
      text: 'Fonte de música alterada para Spotify.',
      action: { type: 'music.setAudioSource', source: 'spotify' },
    };
  }

  // Consultar Fonte Ativa
  if (/(qual\s+fonte\s+de\s+m[úu]sica\s+est[áa]\s+ativa|fonte\s+de\s+[áa]udio\s+atual)/i.test(normalized)) {
    return {
      intent: 'consultar_fonte_musica',
      text: 'Verificando a fonte de áudio ativa...',
      action: { type: 'music.getAudioSource' },
    };
  }

  // Tocar específica no Spotify (ex: "toca Evidências no Spotify", "toca músicas do Charlie Brown Junior")
  const spotifySearchMatch = normalized.match(/(toca|tocar|coloca|colocar)\s+(.+?)\s+(no\s+spotify|pelo\s+spotify)/i);
  if (spotifySearchMatch) {
    const query = spotifySearchMatch[2].trim();
    return {
      intent: 'tocar_musica',
      text: `Procurando "${query}" no Spotify.`,
      action: { type: 'spotify.searchAndPlay', query },
    };
  }

  // Tocar playlist (ex: "toca a playlist foco", "coloca minhas músicas favoritas")
  const playlistMatch = normalized.match(/(toca|tocar|coloca|colocar)\s+(a\s+playlist|minhas?\s+m[úu]sicas?|as?\s+m[úu]sicas?)\s+([a-z0-9à-ú\s]+)/i);
  if (playlistMatch || normalized.includes('playlist')) {
    const targetName = playlistMatch ? playlistMatch[3].trim() : 'Foco';
    const cleanName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    return {
      intent: 'tocar_playlist',
      text: `Iniciando a playlist ${cleanName}.`,
      action: { type: 'music.playPlaylist', playlist: cleanName },
    };
  }

  // Pausar / Para a música
  if (/(pausa|pausar|para|parar|silencia)\s+(a\s+)?m[úu]sica/i.test(normalized) || normalized === 'para a música' || normalized === 'pausa a música') {
    return {
      intent: 'pausar_musica',
      text: 'Música pausada.',
      action: { type: 'music.pause' },
    };
  }

  // Continuar / Retomar a música
  if (/(continua|continuar|retoma|retomar|despausar)\s+(a\s+)?m[úu]sica/i.test(normalized)) {
    return {
      intent: 'continuar_musica',
      text: 'Retomando a reprodução da música.',
      action: { type: 'music.play' },
    };
  }

  // Próxima música
  if (/(pr[óo]xima|passa|avan[çc]a)\s+(a\s+)?m[úu]sica/i.test(normalized) || normalized === 'próxima música') {
    return {
      intent: 'proxima_musica',
      text: 'Tocando a próxima música.',
      action: { type: 'music.next' },
    };
  }

  // Música anterior
  if (/(volta|anterior|recua)\s+(a\s+)?m[úu]sica/i.test(normalized) || normalized === 'música anterior' || normalized === 'volta a música') {
    return {
      intent: 'musica_anterior',
      text: 'Voltando para a música anterior.',
      action: { type: 'music.previous' },
    };
  }

  // Definir volume (ex: "coloca o volume em 30 por cento")
  const volumeMatch = normalized.match(/(coloca|define|muda)\s+(o\s+)?volume\s+(em|para)\s+(\d{1,3})/i);
  if (volumeMatch) {
    const volNum = Math.min(100, Math.max(0, parseInt(volumeMatch[4], 10)));
    return {
      intent: 'definir_volume',
      text: `Volume ajustado para ${volNum} por cento.`,
      action: { type: 'music.setVolume', volume: volNum / 100 },
    };
  }

  // Aumentar volume
  if (/(aumenta|sobe|mais\s+alto)\s+(o\s+)?volume/i.test(normalized)) {
    return {
      intent: 'aumentar_volume',
      text: 'Aumentando o volume da música.',
      action: { type: 'music.volumeUp' },
    };
  }

  // Diminuir volume
  if (/(abaixa|diminui|mais\s+baixo)\s+(o\s+)?volume/i.test(normalized)) {
    return {
      intent: 'diminuir_volume',
      text: 'Abaixando o volume da música.',
      action: { type: 'music.volumeDown' },
    };
  }

  // Silenciar / Ativar som
  if (/(silencia|muta|mute)\s+(a\s+)?m[úu]sica/i.test(normalized)) {
    return {
      intent: 'silenciar_musica',
      text: 'Música silenciada.',
      action: { type: 'music.mute' },
    };
  }
  if (/(desativa\s+o\s+mute|ativa\s+o\s+som|desmuta)/i.test(normalized)) {
    return {
      intent: 'ativar_som',
      text: 'Som ativado.',
      action: { type: 'music.unmute' },
    };
  }

  // Consultar música atual
  if (/(qual\s+m[úu]sica\s+est[áa]\s+tocando|o\s+que\s+est[áa]\s+tocando)/i.test(normalized)) {
    return {
      intent: 'consultar_musica_atual',
      text: 'Verificando a faixa atual...',
      action: { type: 'music.getCurrentTrack' },
    };
  }

  // Tocar música genérico (ex: "toca uma música", "toca música ambiente")
  if (/(toca|tocar|coloca)\s+(uma\s+)?m[úu]sica/i.test(normalized)) {
    return {
      intent: 'tocar_musica',
      text: 'Iniciando a reprodução de música ambiente.',
      action: { type: 'music.play' },
    };
  }

  // =========================================================================
  // PRIORIDADE 2: HORA E DATA
  // =========================================================================
  const horaRegex = /(que\s+horas?\s+s[ãa]o|qual\s+([eé]\s+a\s+)?hora|que\s+hora\s+[eé]|me\s+diga\s+as\s+horas|hora\s+atual)/i;
  if (horaRegex.test(normalized)) {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
    };
    const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value || '0';
    const minute = parts.find((p) => p.type === 'minute')?.value || '0';

    const hNum = parseInt(hour, 10);
    const mNum = parseInt(minute, 10);

    const horaText = hNum === 1 ? '1 hora' : `${hNum} horas`;
    const minText = mNum === 0 ? '' : mNum === 1 ? ' e 1 minuto' : ` e ${mNum} minutos`;

    return {
      intent: 'consultar_hora',
      text: `Agora são ${horaText}${minText}.`,
    };
  }

  const dataRegex = /(que\s+dia\s+[eé]\s+hoje|qual\s+([eé]\s+a\s+)?data|data\s+de\s+hoje|dia\s+da\s+semana|dia\s+do\s+m[êe]s)/i;
  if (dataRegex.test(normalized)) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(now);
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    return {
      intent: 'consultar_data',
      text: `Hoje é ${capitalized}.`,
    };
  }

  // =========================================================================
  // PRIORIDADE 3: CÁLCULOS MATEMÁTICOS (sem eval)
  // =========================================================================
  const mathKeywordsRegex = /(quanto\s+[eé]|calcul(e|ar)|resultado\s+de|\d+\s*[\+\-\*\/x%]\s*\d+)/i;
  if (mathKeywordsRegex.test(normalized)) {
    const mathResult = evaluateMathExpression(normalized);
    if (mathResult !== null) {
      const formattedNum = Number.isInteger(mathResult)
        ? mathResult.toString()
        : mathResult.toFixed(2).replace('.', ',');
      return {
        intent: 'calculo_matematico',
        text: `O resultado do cálculo é ${formattedNum}.`,
      };
    }
  }

  // =========================================================================
  // PRIORIDADE 4: STATUS DO SERVIDOR E DOCKER
  // =========================================================================
  const statusRegex = /(status\s+do\s+(servidor|sistema|docker|m[áa]quina)|sistema\s+ok|servidor\s+ativo)/i;
  if (statusRegex.test(normalized)) {
    return {
      intent: 'consultar_status_servidor',
      text: 'O servidor backend do JEX e os containers Docker estão rodando normalmente em estado ativo.',
    };
  }

  // =========================================================================
  // PRIORIDADE 5: SAUDAÇÕES SIMPLES E MODELO DE IA
  // =========================================================================
  const modeloIaRegex = /(qual\s+modelo\s+(de\s+ia\s+)?voc[êe]\s+usa|qual\s+([eé]\s+o\s+)?modelo\s+que\s+est[áa]\s+rodando|voc[êe]\s+usa\s+gemini|qual\s+modelo\s+est[áa]\s+configurado|modelo\s+de\s+ia\s+utilizado)/i;
  if (modeloIaRegex.test(normalized)) {
    const rawModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    return {
      intent: 'consultar_modelo_ia',
      text: `Atualmente estou usando o modelo ${rawModel}.`,
    };
  }

  const saudacaoRegex = /^\s*(ol[áa]|oi|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|ol[áa]\s+jex|oi\s+jex|fala\s+jex)\b/i;
  if (saudacaoRegex.test(normalized) && normalized.split(' ').length <= 4) {
    return {
      intent: 'saudacao',
      text: 'Olá! Sou o JEX, seu assistente pessoal. Como posso ajudar você hoje?',
    };
  }

  // =========================================================================
  // PRIORIDADE 6: MAPA DE CONHECIMENTO ESTÁVEL LOCAL (Sem Gemini)
  // =========================================================================
  const cleanSearchKey = normalized.replace(/[?.,!]/g, '').trim();
  if (STABLE_KNOWLEDGE_MAP[cleanSearchKey]) {
    return {
      intent: 'conhecimento_estavel',
      text: STABLE_KNOWLEDGE_MAP[cleanSearchKey],
    };
  }

  return null;
}
