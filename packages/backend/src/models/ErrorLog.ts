import mongoose, { Schema } from 'mongoose';
import type { ErrorLogData } from '../types/domain.js';

export type ErrorLogDocument = mongoose.HydratedDocument<ErrorLogData>;

const errorLogSchema = new Schema<ErrorLogData>(
  {
    owner: { type: String, index: true },
    experiment_id: { type: String, index: true },
    severity: { type: String, enum: ['info', 'warning', 'error'], required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    component: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: false }
);

// Compound indexes for pagination and filtering
errorLogSchema.index({ owner: 1, timestamp: -1 });
errorLogSchema.index({ owner: 1, severity: 1, timestamp: -1 });
errorLogSchema.index({ owner: 1, experiment_id: 1, timestamp: -1 });

export default mongoose.model<ErrorLogData>('ErrorLog', errorLogSchema);
