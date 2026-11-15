const mongoose = require('mongoose');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const facultySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    facultyId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: String, trim: true, default: '' },
    specialization: { type: String, trim: true, default: '' },
    maxWeeklyHours: { type: Number, default: 18, min: 1 },
    maxConsecutivePeriods: { type: Number, default: 3, min: 1 },
    availableDays: { type: [String], enum: DAYS, default: DAYS },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

facultySchema.index({ department: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
module.exports.DAYS = DAYS;
