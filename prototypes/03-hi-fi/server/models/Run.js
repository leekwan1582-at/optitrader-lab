const mongoose = require('mongoose');

const robustnessSchema = new mongoose.Schema(
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

const runSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },        // run_id
    profile_id: { type: String, required: true, ref: 'Profile' },
    dataset_id: { type: String, required: true, ref: 'Dataset' },
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
    error_code: { type: String },
  },
  { timestamps: false, _id: false }
);

module.exports = mongoose.model('Run', runSchema);