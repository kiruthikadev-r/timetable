const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ department: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
