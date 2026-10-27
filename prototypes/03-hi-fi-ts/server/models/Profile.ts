import mongoose, { Schema } from 'mongoose';
import type { ProfileData } from '../types/domain.js';

export type ProfileDocument = mongoose.HydratedDocument<ProfileData>;

const profileSchema = new Schema<ProfileData>(
  {
    _id: { type: String, required: true },        // profile_id
    owner: { type: String, required: true, index: true },
    name: { type: String, required: true },
    strategy_type: { type: String, required: true },
    objective: { type: String, required: true },
    max_drawdown_limit: { type: Number },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, _id: false, toJSON: { transform: (_doc, ret) => { ret.profile_id = ret._id; return ret; } } }
);

export default mongoose.model<ProfileData>('Profile', profileSchema);
