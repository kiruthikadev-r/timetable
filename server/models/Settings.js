const mongoose = require('mongoose');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    workingDays: { type: [String], enum: DAYS, default: DAYS },
    collegeStartTime: { type: String, default: '09:00' },
    collegeEndTime: { type: String, default: '16:00' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.DAYS = DAYS;
