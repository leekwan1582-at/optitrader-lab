// server/database.ts
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ MongoDB Connection Error:', message);
    process.exit(1);
  }
};

export default connectDB;
