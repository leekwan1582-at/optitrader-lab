const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ['info', 'warning', 'error'], required: true },
    timestamp: { type: Date, required: true },
    component: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('ErrorLog', errorLogSchema);