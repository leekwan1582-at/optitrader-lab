const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },        // dataset_id
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true },
    date_range: { type: String, required: true },
    rows: { type: Number, required: true },
    status: {
      type: String,
      enum: ['validated', 'pending', 'invalid'],
      default: 'pending',
    },
  },
  { timestamps: true, _id: false }
);

module.exports = mongoose.model('Dataset', datasetSchema);