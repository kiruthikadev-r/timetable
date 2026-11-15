const mongoose = require('mongoose');
const { DAYS } = require('./Faculty');

const facultyAvailabilitySchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    day: { type: String, enum: DAYS, required: true },
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
    status: { type: String, enum: ['available', 'unavailable', 'preferred'], default: 'available' },
  },
  { timestamps: true }
);

facultyAvailabilitySchema.index({ faculty: 1, day: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('FacultyAvailability', facultyAvailabilitySchema);
