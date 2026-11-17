import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function runDiagnosis() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  console.log(`[Diagnóstico] Iniciando teste direto com modelo: ${modelName}`);
  console.log(`[Diagnóstico] Chave configurada: ${Boolean(apiKey)}`);

  if (!apiKey) {
    console.error('[Diagnóstico] ERRO: GEMINI_API_KEY não definida no ambiente!');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = 'Responda apenas: API funcionando.';

  const startTime = Date.now();
  console.log(`[Diagnóstico][${new Date().toISOString()}] Enviando requisição (timeout: 60s)...`);

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DIAG_TIMEOUT')), 60000)
    );

    // Tentar com generateContent
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        maxOutputTokens: 120,
        temperature: 0.2,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    console.log(`[Diagnóstico][SUCESSO] Tempo de resposta: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`[Diagnóstico] Resposta recebida: "${response.text?.trim()}"`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Diagnóstico][FALHA] Duração até o erro: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.error(`[Diagnóstico] Erro detalhado:`, error?.message || error);
    if (error?.status) console.error(`[Diagnóstico] HTTP Status Code:`, error.status);
  }
}

runDiagnosis();
