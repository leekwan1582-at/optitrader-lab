import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

async function checkGemini(): Promise<void> {
  const config = loadConfig();
  logger.info({ model: config.geminiModel, configured: Boolean(config.geminiApiKey) }, 'Checking Gemini status...');

  if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
    logger.error('❌ GEMINI_API_KEY is not set or using the default placeholder.');
    process.exit(1);
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: 'Respond with "PONG" and nothing else.',
    });

    const elapsed = Date.now() - startTime;
    logger.info({
      durationMs: elapsed,
      reply: response.text?.trim(),
      tokens: response.usageMetadata?.totalTokenCount,
    }, '✅ Gemini connection successful!');
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error({
      durationMs: elapsed,
      error: error instanceof Error ? error.message : String(error),
    }, '❌ Gemini connection failed');
    process.exit(1);
  }
}

void checkGemini();

