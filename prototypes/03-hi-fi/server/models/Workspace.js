import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },        // workspace_id
    user: { type: String, index: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
  },
  { timestamps: true, _id: false, toJSON: { transform: (doc, ret) => { ret.workspace_id = ret._id; return ret; } } }
);

export default mongoose.model('Workspace', workspaceSchema);