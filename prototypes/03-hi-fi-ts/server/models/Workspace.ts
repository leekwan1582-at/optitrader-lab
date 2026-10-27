import mongoose, { Schema } from 'mongoose';
import type { WorkspaceData } from '../types/domain.js';

export type WorkspaceDocData = WorkspaceData & { _id: string };
export type WorkspaceDocument = mongoose.HydratedDocument<WorkspaceDocData>;

const workspaceSchema = new Schema<WorkspaceDocData>(
  {
    _id: { type: String, required: true },        // workspace_id
    user: { type: String, index: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
  },
  { timestamps: true, _id: false, toJSON: { transform: (_doc, ret) => { ret.workspace_id = ret._id; return ret; } } }
);

export default mongoose.model<WorkspaceDocData>('Workspace', workspaceSchema);
