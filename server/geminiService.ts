import { GoogleGenAI } from '@google/genai';

export type GeminiErrorType =
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_RATE_LIMIT'
  | 'GEMINI_UNAVAILABLE'
  | 'GEMINI_AUTH_ERROR'
  | 'GEMINI_EMPTY_RESPONSE'
  | 'GEMINI_SAFETY_BLOCK'
  | 'GEMINI_MAX_TOKENS'
  | 'GEMINI_MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface GeminiResponse {
  success: boolean;
  text: string;
  errorType?: GeminiErrorType;
  finishReason?: string;
  retryCount: number;
  durationMs: number;
  textLength: number;
  retryDelaySeconds?: number;
}

const SYSTEM_PROMPT =
  'Você é JEX, assistente pessoal do usuário. Responda em português brasileiro, de forma natural, direta e completa. Para saudações, responda com uma frase curta. Nunca retorne apenas pontuação.';

/**
 * Função utilitária robusta para extração de texto do objeto de resposta do Gemini SDK.
 * Garante parsing completo sem truncamento prematuro ou pontuação isolada.
 */
export function extractGeminiText(response: any): { text: string; finishReason: string; rawDetails?: any } {
  if (!response) {
    return { text: '', finishReason: 'NULL_RESPONSE' };
  }

  // 1. Tentar ler response.text diretamente caso seja uma string não vazia válida
  if (typeof response.text === 'string' && response.text.trim().length > 0) {
    const candidate0 = response.candidates?.[0];
    const finishReason = candidate0?.finishReason || 'STOP';
    const text = response.text.trim();
    if (!isOnlyPunctuation(text)) {
      return { text, finishReason };
    }
  }

  // 2. Percorrer candidates e parts manualmente
  const candidates = response.candidates || [];
  let finishReason = 'NO_CANDIDATE';
  let accumulatedParts: string[] = [];

  if (candidates.length > 0) {
    const firstCandidate = candidates[0];
    finishReason = firstCandidate.finishReason || 'STOP';

    const parts = firstCandidate.content?.parts || [];
    for (const part of parts) {
      if (part && typeof part.text === 'string') {
        accumulatedParts.push(part.text);
      }
    }
  }

  const concatenated = accumulatedParts.join('').trim();

  // 3. Validar se o texto é apenas pontuação ou vírgula isolada
  if (isOnlyPunctuation(concatenated)) {
    return { text: '', finishReason, rawDetails: extractDiagnosticMetadata(response) };
  }

  return { text: concatenated, finishReason, rawDetails: extractDiagnosticMetadata(response) };
}

/**
 * Verifica se um texto consiste apenas em pontuação, símbolos ou espaços sem palavras reais.
 */
function isOnlyPunctuation(str: string): boolean {
  if (!str) return true;
  const cleaned = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'…\s]/g, '');
  return cleaned.length === 0;
}

/**
 * Extrai metadados estruturados para diagnósticos de respostas vazias ou bloqueadas.
 */
function extractDiagnosticMetadata(response: any) {
  const candidate = response?.candidates?.[0];
  return {
    candidateCount: response?.candidates?.length || 0,
    finishReason: candidate?.finishReason || 'UNKNOWN',
    promptFeedback: response?.promptFeedback || null,
    safetyRatings: candidate?.safetyRatings || response?.safetyRatings || [],
    usageMetadata: response?.usageMetadata || null,
  };
}

/**
 * Serviço de integração síncrono (geração direta generateContent sem streaming)
 * otimizado com a extração robusta de texto `extractGeminiText`.
 */
export async function generateGeminiResponse(
  message: string,
  requestId: string
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    console.warn(`[GeminiService][req:${requestId}] GEMINI_API_KEY não definida.`);
    return {
      success: false,
      text: 'A chave GEMINI_API_KEY não foi configurada no servidor backend.',
      errorType: 'GEMINI_AUTH_ERROR',
      retryCount: 0,
      durationMs: Date.now() - startTime,
      textLength: 0,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 1;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const attemptStartTime = Date.now();
    try {
      if (attempt > 0) {
        console.log(`[GeminiService][req:${requestId}] Retry attempt ${attempt}/${maxRetries}...`);
      }

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 45000);

      // USO DE generateContent() SÍNCRONO (SEM STREAMING)
      const responsePromise = ai.models.generateContent({
        model: modelName,
        contents: message,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 800, // Permite 800 tokens para incluir pensamentos sem cortar o texto de saída
          temperature: 0.4,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutController.signal.addEventListener('abort', () =>
          reject(new Error('GEMINI_TIMEOUT'))
        );
      });

      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const totalDuration = Date.now() - startTime;
      const { text, finishReason, rawDetails } = extractGeminiText(response);

      // Tratamento de resposta vazia ou bloqueada
      if (!text) {
        console.warn(
          `[GeminiService][req:${requestId}] Resposta vazia/inválida detectada. Metadados:`,
          JSON.stringify(rawDetails || extractDiagnosticMetadata(response))
        );

        let errType: GeminiErrorType = 'GEMINI_EMPTY_RESPONSE';
        if (finishReason === 'SAFETY') errType = 'GEMINI_SAFETY_BLOCK';
        else if (finishReason === 'MAX_TOKENS') errType = 'GEMINI_MAX_TOKENS';

        return {
          success: false,
          text: 'O assistente não conseguiu gerar uma resposta adequada.',
          errorType: errType,
          finishReason,
          retryCount: attempt,
          durationMs: totalDuration,
          textLength: 0,
        };
      }

      console.log(
        `[GeminiService][req:${requestId}] SUCESSO (${text.length} chars, finishReason: ${finishReason}) em ${totalDuration}ms.`
      );

      return {
        success: true,
        text,
        finishReason,
        retryCount: attempt,
        durationMs: totalDuration,
        textLength: text.length,
      };
    } catch (error: any) {
      const attemptDuration = Date.now() - attemptStartTime;
      const totalDuration = Date.now() - startTime;
      const errMsg = String(error?.message || error);

      console.warn(`[GeminiService][req:${requestId}] Erro na tentativa ${attempt + 1} (${attemptDuration}ms): ${errMsg}`);

      let errType: GeminiErrorType = 'UNKNOWN_ERROR';
      let shouldRetry = false;
      let delaySeconds = 0;

      if (errMsg.includes('GEMINI_TIMEOUT') || error?.name === 'AbortError') {
        errType = 'GEMINI_TIMEOUT';
        shouldRetry = false;
      } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        errType = 'GEMINI_RATE_LIMIT';
        shouldRetry = true;
        delaySeconds = 3;
      } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('fetch failed')) {
        errType = 'GEMINI_UNAVAILABLE';
        shouldRetry = true;
        delaySeconds = 2;
      } else if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API_KEY_INVALID')) {
        errType = 'GEMINI_AUTH_ERROR';
        shouldRetry = false;
      }

      if (shouldRetry && attempt < maxRetries) {
        console.log(`[GeminiService][req:${requestId}] Aguardando ${delaySeconds}s para tentar novamente...`);
        await new Promise((res) => setTimeout(res, delaySeconds * 1000));
        attempt++;
        continue;
      }

      let friendlyText = 'Não foi possível obter resposta do assistente no momento.';
      if (errType === 'GEMINI_TIMEOUT') {
        friendlyText = 'O tempo limite de resposta do Gemini foi excedido.';
      } else if (errType === 'GEMINI_RATE_LIMIT') {
        friendlyText = 'Minha inteligência online está temporariamente indisponível, mas os comandos locais continuam funcionando.';
      } else if (errType === 'GEMINI_UNAVAILABLE') {
        friendlyText = 'O serviço Gemini está temporariamente indisponível.';
      } else if (errType === 'GEMINI_AUTH_ERROR') {
        friendlyText = 'Falha de autenticação com a API Gemini.';
      }

      return {
        success: false,
        text: friendlyText,
        errorType: errType,
        finishReason: 'ERROR',
        retryCount: attempt,
        durationMs: totalDuration,
        textLength: 0,
        retryDelaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
      };
    }
  }

  return {
    success: false,
    text: 'Limite de tentativas excedido ao se comunicar com o Gemini.',
    errorType: 'GEMINI_UNAVAILABLE',
    finishReason: 'MAX_RETRIES',
    retryCount: attempt,
    durationMs: Date.now() - startTime,
    textLength: 0,
  };
}
