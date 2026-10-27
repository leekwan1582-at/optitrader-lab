import mongoose, { Schema } from 'mongoose';
import type { DatasetData } from '../types/domain.js';

export type DatasetDocument = mongoose.HydratedDocument<DatasetData>;

const datasetSchema = new Schema<DatasetData>(
  {
    _id: { type: String, required: true },        // dataset_id
    owner: { type: String, required: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true },
    date_range: { type: String, required: true },
    rows: { type: Number, required: true },
    file_ref: { type: String },
    original_filename: { type: String },
    status: {
      type: String,
      enum: ['validated', 'pending', 'invalid'],
      default: 'pending',
    },
  },
  { timestamps: true, _id: false, toJSON: { transform: (_doc, ret) => { ret.dataset_id = ret._id; return ret; } } }
);

export default mongoose.model<DatasetData>('Dataset', datasetSchema);
