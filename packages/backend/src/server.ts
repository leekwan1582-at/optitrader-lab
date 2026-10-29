import 'dotenv/config';
import mongoose from 'mongoose';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import connectDB from './database.js';
import { logger } from './logger.js';
import { processRegistry } from './workers/processRegistry.js';

async function main(): Promise<void> {
  const config = loadConfig();
  await connectDB();

  const app = createApp(config);
  const server: Server = app.listen(config.port, () => {
    logger.info(`🚀 OptiTrader API listening on http://localhost:${config.port}`);
    logger.info(`   CORS origin: ${config.clientUrl}`);
    logger.info(`   Gemini model: ${config.geminiModel}`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`\n${signal} received; shutting down.`);
    await processRegistry.shutdownAll();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ message }, '❌ Failed to start server');
  process.exit(1);
});
