const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, unique: true },
    label: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['period', 'break', 'lunch'], default: 'period' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
