import { useState, useEffect, useRef, useCallback } from 'react';

export type SynthesisState = 'idle' | 'speaking' | 'paused' | 'error';

export interface VoicePreferences {
  voiceURI: string;
  rate: number;   // 0.7 to 1.3
  pitch: number;  // 0.7 to 1.3
  volume: number; // 0.0 to 1.0
}

export interface SystemVoiceDiagnosticInfo {
  mechanism: 'Voz do sistema';
  voiceName: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
}

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

const STORAGE_KEY = 'jex_voice_preferences';

export interface UseSpeechSynthesisOptions {
  onStartSpeaking?: () => void;
  onEndSpeaking?: () => void;
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  synthesisState: SynthesisState;
  voices: SpeechSynthesisVoice[];
  preferences: VoicePreferences;
  selectedVoice: SpeechSynthesisVoice | null;
  selectedVoiceName: string;
  errorMessage: string | null;
  voiceDiagnostics: SystemVoiceDiagnosticInfo;
  speak: (text: string) => void;
  testVoice: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  updatePreferences: (newPrefs: Partial<VoicePreferences>) => void;
  resetPreferences: () => void;
}

export function useSpeechSynthesis(
  options?: UseSpeechSynthesisOptions
): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [synthesisState, setSynthesisState] = useState<SynthesisState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Carregando voz do sistema...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [preferences, setPreferencesState] = useState<VoicePreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          voiceURI: parsed.voiceURI || '',
          rate: typeof parsed.rate === 'number' ? Math.min(1.3, Math.max(0.7, parsed.rate)) : 1.0,
          pitch: typeof parsed.pitch === 'number' ? Math.min(1.3, Math.max(0.7, parsed.pitch)) : 1.0,
          volume: typeof parsed.volume === 'number' ? Math.min(1.0, Math.max(0, parsed.volume)) : 1.0,
        };
      }
    } catch (e) {
      console.warn('[SpeechSynthesis] Erro ao ler preferências do localStorage:', e);
    }
    return DEFAULT_VOICE_PREFERENCES;
  });

  const preferencesRef = useRef<VoicePreferences>(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Carrega e ordena todas as vozes do sistema (pt-BR > pt > restantes)
  const updateSystemVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      setErrorMessage('Seu navegador não suporta a Web Speech API de síntese de fala.');
      return;
    }

    setIsSupported(true);
    const available = window.speechSynthesis.getVoices();
    if (!available || available.length === 0) return;

    // Ordenação amigável: pt-BR primeiro, pt em seguida, outras depois
    const sorted = [...available].sort((a, b) => {
      const langA = a.lang.toLowerCase().replace('_', '-');
      const langB = b.lang.toLowerCase().replace('_', '-');

      if (langA === 'pt-br' && langB !== 'pt-br') return -1;
      if (langB === 'pt-br' && langA !== 'pt-br') return 1;

      if (langA.startsWith('pt') && !langB.startsWith('pt')) return -1;
      if (langB.startsWith('pt') && !langA.startsWith('pt')) return 1;

      return a.name.localeCompare(b.name);
    });

    setVoices(sorted);

    // RESTAURAR A VOZ SALVA NO LOCALSTORAGE OU SELECIONAR A MELHOR PT-BR
    const savedURI = preferencesRef.current.voiceURI;
    let chosen: SpeechSynthesisVoice | undefined;

    if (savedURI) {
      chosen = sorted.find((v) => v.voiceURI === savedURI);
    }

    if (!chosen) {
      chosen = sorted.find(
        (v) => v.lang.toLowerCase() === 'pt-br' || v.lang.toLowerCase().replace('_', '-') === 'pt-br'
      );
    }

    if (!chosen) {
      chosen = sorted.find((v) => v.lang.toLowerCase().startsWith('pt'));
    }

    if (!chosen) {
      chosen = sorted[0];
    }

    if (chosen) {
      setSelectedVoice(chosen);
      setSelectedVoiceName(`${chosen.name} (${chosen.lang})`);
    } else {
      setSelectedVoice(null);
      setSelectedVoiceName('Voz Padrão do Sistema');
    }
  }, []);

  useEffect(() => {
    updateSystemVoices();
    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateSystemVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, [updateSystemVoices]);

  // Atualizar preferências e persistir estritamente no localStorage
  const updatePreferences = useCallback((newPrefs: Partial<VoicePreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[SpeechSynthesis] Erro ao salvar preferências:', e);
      }
      return updated;
    });
  }, []);

  // Recarregar voz quando voiceURI mudar
  useEffect(() => {
    updateSystemVoices();
  }, [preferences.voiceURI, updateSystemVoices]);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_VOICE_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    updateSystemVoices();
  }, [updateSystemVoices]);

  // Cancelar a fala anterior para impedir sobreposição
  const stop = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[SpeechSynthesis] Erro ao cancelar fala:', e);
    }
    setSynthesisState('idle');
    if (optionsRef.current?.onEndSpeaking) {
      optionsRef.current.onEndSpeaking();
    }
  }, []);

  // Síntese de fala oficial via WebSpeech API
  const speak = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) {
        setErrorMessage('Síntese de fala não suportada no seu navegador.');
        return;
      }

      if (!text || !text.trim()) return;

      // IMPEDIR SOBREPOSIÇÃO DE FALAS
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      setErrorMessage(null);

      const utterance = new SpeechSynthesisUtterance(text.trim());
      const currentPrefs = preferencesRef.current;

      utterance.rate = currentPrefs.rate;
      utterance.pitch = currentPrefs.pitch;
      utterance.volume = currentPrefs.volume;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'pt-BR';
      }

      utterance.onstart = () => {
        setSynthesisState('speaking');
        if (optionsRef.current?.onStartSpeaking) {
          optionsRef.current.onStartSpeaking();
        }
      };

      utterance.onend = () => {
        setSynthesisState('idle');
        if (optionsRef.current?.onEndSpeaking) {
          optionsRef.current.onEndSpeaking();
        }
      };

      utterance.onerror = (event) => {
        console.error('[SpeechSynthesis] Erro na fala:', event);
        setSynthesisState('error');
        setErrorMessage('Erro ao reproduzir voz do assistente.');
        if (optionsRef.current?.onEndSpeaking) {
          optionsRef.current.onEndSpeaking();
        }
      };

      utterance.onpause = () => setSynthesisState('paused');
      utterance.onresume = () => setSynthesisState('speaking');

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        console.error('[SpeechSynthesis] Falha em speak():', err);
        setSynthesisState('error');
        setErrorMessage(`Falha na síntese de áudio: ${err.message || err}`);
      }
    },
    [selectedVoice]
  );

  const testVoice = useCallback(() => {
    speak('Olá Jean, eu sou o JEX. Esta é a minha nova voz.');
  }, [speak]);

  const pause = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.pause();
      setSynthesisState('paused');
    } catch (e) {}
  }, []);

  const resume = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.resume();
      setSynthesisState('speaking');
    } catch (e) {}
  }, []);

  const voiceDiagnostics: SystemVoiceDiagnosticInfo = {
    mechanism: 'Voz do sistema',
    voiceName: selectedVoice?.name || 'Voz Padrão',
    lang: selectedVoice?.lang || 'pt-BR',
    rate: preferences.rate,
    pitch: preferences.pitch,
    volume: preferences.volume,
  };

  return {
    isSupported,
    synthesisState,
    voices,
    preferences,
    selectedVoice,
    selectedVoiceName,
    errorMessage,
    voiceDiagnostics,
    speak,
    testVoice,
    stop,
    pause,
    resume,
    updatePreferences,
    resetPreferences,
  };
}
