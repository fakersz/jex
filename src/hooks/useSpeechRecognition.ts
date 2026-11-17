import { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState } from '../types/assistant';

export interface SpeechDiagnosticInfo {
  currentState: string;
  lastEvent: string;
  lastError: string | null;
  interimTranscript: string;
  finalTranscript: string;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastTranscript: string;
  errorMessage: string | null;
  technicalError: string | null;
  lastEvent: string;
  diagnostics: SpeechDiagnosticInfo;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

export function useSpeechRecognition(
  onStateChange?: (state: AssistantState) => void,
  currentState: AssistantState = 'available'
): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState<string>(() => {
    return localStorage.getItem('jex_last_transcript') || '';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>('nenhum');

  const isStartedRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    // Prefer webkitSpeechRecognition in Chrome
    const SpeechRecognitionClass =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('[WebSpeech] Nenhum construtor de SpeechRecognition encontrado.');
      setIsSupported(false);
      setErrorMessage('Seu navegador não possui suporte à Web Speech API. Use o Google Chrome.');
      return;
    }

    setIsSupported(true);
    console.log('[WebSpeech] Web Speech API suportada e inicializada.');

    const instance = new SpeechRecognitionClass();
    instance.lang = 'pt-BR';
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 3;

    // 1. ONSTART
    instance.onstart = () => {
      console.log('[WebSpeech] Evento: onstart');
      setLastEvent('onstart');
      setIsListening(true);
      isStartedRef.current = true;
      setErrorMessage(null);
      setTechnicalError(null);
      setInterimTranscript('');
      if (onStateChangeRef.current) {
        onStateChangeRef.current('listening');
      }
    };

    // 2. ONAUDIOSTART
    instance.onaudiostart = () => {
      console.log('[WebSpeech] Evento: onaudiostart');
      setLastEvent('onaudiostart');
    };

    // 3. ONSPEECHSTART
    instance.onspeechstart = () => {
      console.log('[WebSpeech] Evento: onspeechstart');
      setLastEvent('onspeechstart');
    };

    // 4. ONSPEECHEND
    instance.onspeechend = () => {
      console.log('[WebSpeech] Evento: onspeechend');
      setLastEvent('onspeechend');
    };

    // 5. ONAUDIOEND
    instance.onaudioend = () => {
      console.log('[WebSpeech] Evento: onaudioend');
      setLastEvent('onaudioend');
    };

    // 6. ONNOMATCH
    instance.onnomatch = () => {
      console.log('[WebSpeech] Evento: onnomatch (Nenhum resultado correspondente)');
      setLastEvent('onnomatch');
    };

    // 7. ONRESULT
    instance.onresult = (event: any) => {
      console.log('[WebSpeech] Evento: onresult', event);
      setLastEvent('onresult');

      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          currentFinal += text;
        } else {
          currentInterim += text;
        }
      }

      setInterimTranscript(currentInterim);

      if (currentFinal.trim()) {
        const cleanedFinal = currentFinal.trim();
        setTranscript(cleanedFinal);
        setLastTranscript(cleanedFinal);
        setInterimTranscript('');

        try {
          localStorage.setItem('jex_last_transcript', cleanedFinal);
        } catch (e) {
          console.warn('[WebSpeech] Erro ao salvar no localStorage:', e);
        }
      }
    };

    // 8. ONERROR
    instance.onerror = (event: any) => {
      const errCode = event.error || 'erro_desconhecido';
      console.error('[WebSpeech] Evento: onerror', errCode, event);
      setLastEvent(`onerror (${errCode})`);
      setTechnicalError(errCode);

      let msg = 'Erro no reconhecimento de voz.';
      switch (errCode) {
        case 'not-allowed':
        case 'service-not-allowed':
          msg = 'Permissão de microfone negada. Permita o microfone no navegador.';
          break;
        case 'no-speech':
          msg = 'Nenhuma fala foi detectada. Fale mais próximo ao microfone.';
          break;
        case 'audio-capture':
          msg = 'Nenhum dispositivo de microfone foi encontrado.';
          break;
        case 'network':
          msg = 'Erro de conexão com o serviço de voz.';
          break;
        case 'aborted':
          msg = 'Captura de voz interrompida.';
          break;
        default:
          msg = `Erro técnico (${errCode}).`;
      }

      setErrorMessage(msg);

      if (errCode === 'not-allowed' || errCode === 'audio-capture') {
        try {
          instance.abort();
        } catch (e) {}
      }
    };

    // 9. ONEND
    instance.onend = () => {
      console.log('[WebSpeech] Evento: onend');
      setLastEvent('onend');
      setIsListening(false);
      isStartedRef.current = false;

      // Altera o estado sem reiniciar automaticamente
      if (onStateChangeRef.current) {
        onStateChangeRef.current('processing');
        setTimeout(() => {
          if (onStateChangeRef.current) {
            onStateChangeRef.current('responding');
          }
        }, 800);
      }
    };

    recognitionRef.current = instance;

    // LIMPEZA DE HANDLERS AO DESMONTAR
    return () => {
      console.log('[WebSpeech] Desmontando hook e limpando handlers.');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onaudiostart = null;
          recognitionRef.current.onspeechstart = null;
          recognitionRef.current.onspeechend = null;
          recognitionRef.current.onaudioend = null;
          recognitionRef.current.onnomatch = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {
          // Ignorar erros de abort no desmonte
        }
      }
    };
  }, []);

  // START LISTENING (com verificação anti-duplicação)
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.warn('[WebSpeech] Impossível iniciar: SpeechRecognition não inicializado.');
      return;
    }

    if (isStartedRef.current) {
      console.warn('[WebSpeech] Chamada start() duplicada ignorada (já está ouvindo).');
      return;
    }

    setErrorMessage(null);
    setTechnicalError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      console.log('[WebSpeech] Executando recognition.start()...');
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('[WebSpeech] Erro ao chamar start():', err);
      setTechnicalError(err.name || 'start_exception');
      setErrorMessage(`Falha ao iniciar escuta: ${err.message || err.name}`);
    }
  }, []);

  // STOP LISTENING
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      console.log('[WebSpeech] Executando recognition.stop()...');
      recognitionRef.current.stop();
    } catch (err: any) {
      console.warn('[WebSpeech] Erro ao chamar stop():', err);
    }
  }, []);

  // TOGGLE LISTENING
  const toggleListening = useCallback(() => {
    if (isStartedRef.current || isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // CLEAR TRANSCRIPT
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setLastTranscript('');
    localStorage.removeItem('jex_last_transcript');
  }, []);

  const diagnostics: SpeechDiagnosticInfo = {
    currentState,
    lastEvent,
    lastError: technicalError,
    interimTranscript,
    finalTranscript: transcript || lastTranscript,
  };

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    lastTranscript,
    errorMessage,
    technicalError,
    lastEvent,
    diagnostics,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
