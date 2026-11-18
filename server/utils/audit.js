const AuditLog = require('../models/AuditLog');

const logAction = async (user, action, entityType, entityId, { department, details } = {}) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      action,
      entityType,
      entityId: entityId || null,
      department: department || null,
      details: details || {},
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = logAction;
