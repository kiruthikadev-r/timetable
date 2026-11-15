const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

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

module.exports = { list, markRead, markAllRead };
