import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../database.js';
import { logger } from '../logger.js';

async function main(): Promise<void> {
  await connectDB();
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  logger.error({ error }, '❌ Database check failed');
  process.exit(1);
});
