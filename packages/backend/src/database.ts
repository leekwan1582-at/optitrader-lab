// server/database.ts
import mongoose from 'mongoose';
import { logger } from './logger.js';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('✅ MongoDB Connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ message }, '❌ MongoDB Connection Error');
    process.exit(1);
  }
};

export default connectDB;
