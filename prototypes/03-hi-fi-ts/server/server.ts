import 'dotenv/config';
import mongoose from 'mongoose';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import connectDB from './database.js';

async function main(): Promise<void> {
  const config = loadConfig();
  await connectDB();

  const app = createApp(config);
  const server: Server = app.listen(config.port, () => {
    console.log(`🚀 OptiTrader API listening on http://localhost:${config.port}`);
    console.log(`   CORS origin: ${config.clientUrl}`);
    console.log(`   Gemini model: ${config.geminiModel}`);
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received; shutting down.`);
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
  console.error('❌ Failed to start server:', message);
  process.exit(1);
});
