const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, default: 192 },
  height: { type: Number, default: 64 },
  signatureImage: { type: String },
  
  // NEW: Store Scale Context
  viewportWidth: { type: Number, default: 600 },
  viewportHeight: { type: Number, default: 800 },

  status: { type: String, enum: ['Pending', 'Signed'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Signature', signatureSchema);