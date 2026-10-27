import mongoose from 'mongoose';

const paramRangeSchema = new mongoose.Schema(
  { min: Number, max: Number, step: Number },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },        // profile_id
    owner: { type: String, required: true, index: true },
    name: { type: String, required: true },
    strategy_type: { type: String, required: true },
    objective: { type: String, required: true },
    max_drawdown_limit: { type: Number },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, _id: false, toJSON: { transform: (doc, ret) => { ret.profile_id = ret._id; return ret; } } }
);

export default mongoose.model('Profile', profileSchema);