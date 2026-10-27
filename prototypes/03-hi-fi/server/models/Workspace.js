const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },        // workspace_id
    name: { type: String, required: true },
    owner: { type: String, required: true },
  },
  { timestamps: true, _id: false }
);

module.exports = mongoose.model('Workspace', workspaceSchema);