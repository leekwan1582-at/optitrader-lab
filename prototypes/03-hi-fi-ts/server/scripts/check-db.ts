import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../database.js';

async function main(): Promise<void> {
  await connectDB();
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error('❌ Database check failed:', error);
  process.exit(1);
});
