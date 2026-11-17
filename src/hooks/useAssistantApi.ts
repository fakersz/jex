import { useState, useRef, useCallback } from 'react';

export interface AssistantApiResponse {
  success: boolean;
  source: 'local' | 'gemini';
  intent: string;
  text: string;
  action?: {
    type: string;
    [key: string]: any;
  };
  data?: any;
  errorType?: string;
  requestId?: string;
  durationMs?: number;
  retryCount?: number;
  retryDelaySeconds?: number;
  cached?: boolean;
}

export interface AssistantCounters {
  totalCommands: number;
  totalGeminiCalls: number;
  totalLocalResponses: number;
  total429Errors: number;
}

export interface UseAssistantApiReturn {
  isLoading: boolean;
  lastResponse: AssistantApiResponse | null;
  errorMessage: string | null;
  counters: AssistantCounters;
  sendAssistantMessage: (message: string) => Promise<AssistantApiResponse | null>;
  cancelOngoingRequest: () => void;
}

export function useAssistantApi(): UseAssistantApiReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<AssistantApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [counters, setCounters] = useState<AssistantCounters>({
    totalCommands: 0,
    totalGeminiCalls: 0,
    totalLocalResponses: 0,
    total429Errors: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProcessedRef = useRef<{ message: string; timestamp: number } | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const cancelOngoingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[AssistantAPI] Cancelando requisição backend anterior.');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, []);

  const sendAssistantMessage = useCallback(
    async (message: string): Promise<AssistantApiResponse | null> => {
      if (!message || !message.trim()) return null;

      const trimmed = message.trim();
      const now = Date.now();

      // PROTEÇÃO CONTRA DUPLICIDADE:
      // Se a mensagem for idêntica à última enviada e tiverem se passado menos de 10 segundos ➔ ignorar
      if (
        lastProcessedRef.current &&
        lastProcessedRef.current.message.toLowerCase() === trimmed.toLowerCase() &&
        now - lastProcessedRef.current.timestamp < 10000
      ) {
        console.warn(`[AssistantAPI] Comando idêntico ignorado por janela de 10s ("${trimmed}").`);
        return lastResponse;
      }

      // IMPEDIR REQUISIÇÕES PARALELAS
      if (isProcessingRef.current) {
        console.warn('[AssistantAPI] Requisição backend já em andamento. Cancelando anterior...');
        cancelOngoingRequest();
      }

      const requestId = `req_${now}_${Math.random().toString(36).substring(2, 7)}`;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isProcessingRef.current = true;
      lastProcessedRef.current = { message: trimmed, timestamp: now };

      setIsLoading(true);
      setErrorMessage(null);

      // Incrementar contador de comandos do usuário
      setCounters((prev) => ({
        ...prev,
        totalCommands: prev.totalCommands + 1,
      }));

      try {
        console.log(`[AssistantAPI][req:${requestId}] Enviando para /api/assistant: "${trimmed}"`);

        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            message: trimmed,
            context: {},
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: AssistantApiResponse = await response.json();
        setLastResponse(data);
        setIsLoading(false);
        isProcessingRef.current = false;
        abortControllerRef.current = null;

        // Atualizar contadores do painel de diagnóstico
        setCounters((prev) => {
          const isGemini = data.source === 'gemini';
          const is429 = data.errorType === 'RATE_LIMIT';

          return {
            ...prev,
            totalGeminiCalls: isGemini ? prev.totalGeminiCalls + 1 : prev.totalGeminiCalls,
            totalLocalResponses: !isGemini ? prev.totalLocalResponses + 1 : prev.totalLocalResponses,
            total429Errors: is429 ? prev.total429Errors + 1 : prev.total429Errors,
          };
        });

        return data;
      } catch (error: any) {
        setIsLoading(false);
        isProcessingRef.current = false;
        abortControllerRef.current = null;

        if (error.name === 'AbortError') {
          console.log('[AssistantAPI] Requisição cancelada.');
          return null;
        }

        console.error('[AssistantAPI] Erro de comunicação backend:', error);

        const fallback: AssistantApiResponse = {
          success: false,
          source: 'local',
          intent: 'erro_conexao',
          text: 'Falha ao se conectar com o servidor do JEX.',
        };
        setErrorMessage('Erro na comunicação com o servidor backend.');
        setLastResponse(fallback);

        setCounters((prev) => ({
          ...prev,
          totalLocalResponses: prev.totalLocalResponses + 1,
        }));

        return fallback;
      }
    },
    [cancelOngoingRequest, lastResponse]
  );

  return {
    isLoading,
    lastResponse,
    errorMessage,
    counters,
    sendAssistantMessage,
    cancelOngoingRequest,
  };
}
