import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema(
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

export default mongoose.model('ErrorLog', errorLogSchema);