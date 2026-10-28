import mongoose, { Schema } from 'mongoose';

export interface SettingData {
  key: string;
  value: unknown;
}

export type SettingDocument = mongoose.HydratedDocument<SettingData>;

const settingSchema = new Schema<SettingData>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<SettingData>('Setting', settingSchema);
