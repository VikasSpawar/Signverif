const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  action: { type: String, required: true }, // e.g., 'Created', 'Shared', 'Viewed', 'Signed'
  userEmail: { type: String },              // Who did it (Owner email or Signer email)
  ipAddress: { type: String },              // Network location
  userAgent: { type: String },              // Browser/Device info
  details: { type: String },                // Extra info (e.g., "Signed via Public Link")
}, { timestamps: true }); // Automatically adds 'createdAt' for the exact timestamp

module.exports = mongoose.model('AuditLog', auditLogSchema);