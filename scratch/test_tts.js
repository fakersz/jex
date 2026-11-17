import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No API key');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTest = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing audio modality on ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: 'Fale em português: Olá',
        config: {
          responseModalities: ['AUDIO'],
        },
      });
      const parts = response?.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find((p) => p.inlineData && p.inlineData.data);
      if (audioPart) {
        console.log(`SUCCESS on ${modelName}! Received audio bytes: ${audioPart.inlineData.data.length}`);
        return;
      } else {
        console.log(`No audio part in ${modelName} response.`);
      }
    } catch (e) {
      console.log(`Failed on ${modelName}:`, e.message || e);
    }
  }
}

testModels();
