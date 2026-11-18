const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['timetable_published', 'timetable_modified', 'assignment_change', 'classroom_change', 'approval_request', 'timetable_rejected', 'conflict_reported'],
      required: true,
    },
    relatedTimetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
