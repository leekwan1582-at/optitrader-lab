import mongoose, { Schema } from 'mongoose';
import type { ErrorLogData } from '../types/domain.js';

export type ErrorLogDocument = mongoose.HydratedDocument<ErrorLogData>;

const errorLogSchema = new Schema<ErrorLogData>(
  {
    owner: { type: String, index: true },
    experiment_id: { type: String, index: true },
    severity: { type: String, enum: ['info', 'warning', 'error'], required: true },
    timestamp: { type: Date, required: true },
    component: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: false }
);

export default mongoose.model<ErrorLogData>('ErrorLog', errorLogSchema);
