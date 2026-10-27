import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import connectDB from './database.js';

async function main() {
  const config = loadConfig();
  await connectDB();

  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`🚀 OptiTrader API listening on http://localhost:${config.port}`);
    console.log(`   CORS origin: ${config.clientUrl}`);
    console.log(`   Gemini model: ${config.geminiModel}`);
  });

  async function shutdown(signal) {
    console.log(`\n${signal} received; shutting down.`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});
