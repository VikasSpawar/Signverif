const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Pending', 'Signed'], default: 'Draft' },
  
  // NEW FIELDS FOR SHARING
  shareToken: { type: String },
  recipientEmail: { type: String },
  accessCode: { type: String, default: null },
  status: { type: String, enum: ['Draft', 'Pending', 'Signed', 'Rejected'], default: 'Draft' }, // Added 'Rejected'
  rejectionReason: { type: String, default: null },
  
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);