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
    profile_id: { type: String, required: true, ref: 'Profile' },
    dataset_id: { type: String, required: true, ref: 'Dataset' },
    run_hash: { type: String, index: true },
    config: { type: mongoose.Schema.Types.Mixed },
    profile_snapshot: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['completed', 'failed', 'running', 'queued'],
      required: true,
    },
    created_at: { type: Date, required: true },
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

export default mongoose.model<RunData>('Run', runSchema);
