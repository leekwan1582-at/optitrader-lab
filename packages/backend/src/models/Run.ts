import mongoose, { Schema } from 'mongoose';
import type { RunData } from '../types/domain.js';

export type RunDocument = mongoose.HydratedDocument<RunData>;

const robustnessSchema = new Schema(
  {
    confidence_score: Number,
    edge_of_grid: Boolean,
    out_of_sample_drop: Number,
    transaction_costs_included: Boolean,
    walk_forward_completed: Boolean,
    warnings: [String],
  },
  { _id: false }
);

const runSchema = new Schema<RunData>(
  {
    _id: { type: String, required: true },        // run_id
    owner: { type: String, required: true, index: true },
    profile_id: { type: String, required: true, ref: 'Profile', index: true },
    dataset_id: { type: String, required: true, ref: 'Dataset', index: true },
    retried_from: { type: String, ref: 'Run' },
    run_hash: { type: String, index: true },
    config: { type: mongoose.Schema.Types.Mixed },
    profile_snapshot: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['completed', 'failed', 'running', 'queued', 'cancelled'],
      required: true,
      index: true,
    },
    created_at: { type: Date, required: true, index: true },
    duration_ms: { type: Number },
    holdout_pct: { type: Number },
    trials: { type: Number },
    best: { type: mongoose.Schema.Types.Mixed },
    robustness: { type: robustnessSchema },
    equity_curve: { type: [Number], default: [] },
    ai_summary: { type: mongoose.Schema.Types.Mixed },
    error_code: { type: String },
    error_message: { type: String },
  },
  { timestamps: false, _id: false, toJSON: { transform: (_doc, ret) => { ret.run_id = ret._id; return ret; } } }
);

// Compound indexes for optimal queries and pagination
runSchema.index({ owner: 1, created_at: -1 });
runSchema.index({ owner: 1, status: 1, created_at: -1 });
runSchema.index({ owner: 1, dataset_id: 1, created_at: -1 });

export default mongoose.model<RunData>('Run', runSchema);
