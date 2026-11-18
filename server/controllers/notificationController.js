const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logAction = require('../utils/audit');

const list = asyncHandler(async (req, res) => {
  const rows = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(100);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ success: true, data: rows, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true });
  res.json({ success: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
});

// POST /api/notifications/report-conflict  body: { message, relatedTimetable? }
// Lets a faculty member flag a scheduling problem they've spotted on their own
// published timetable; it fans out to their department's HODs and every
// superadmin rather than requiring them to know who to email.
const reportConflict = asyncHandler(async (req, res) => {
  const { message, relatedTimetable } = req.body;
  if (!message || !message.trim()) throw new ApiError(400, 'Please describe the conflict');

  const recipients = await User.find({
    isActive: true,
    $or: [{ role: 'superadmin' }, { role: 'hod', department: req.user.department }],
  });

  if (recipients.length) {
    await Notification.insertMany(
      recipients.map((u) => ({
        user: u._id,
        title: `Conflict reported by ${req.user.name}`,
        message,
        type: 'conflict_reported',
        relatedTimetable: relatedTimetable || null,
      }))
    );
  }

  await logAction(req.user, 'reported a scheduling conflict', 'Notification', null, { department: req.user.department, details: { message } });

  res.status(201).json({ success: true, message: 'Reported to your HOD and the administrator' });
});

module.exports = { list, markRead, markAllRead, reportConflict };
