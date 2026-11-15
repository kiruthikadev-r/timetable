const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    type: { type: String, enum: ['Theory', 'Practical', 'Lab'], default: 'Theory' },
    weeklyPeriods: { type: Number, required: true, min: 1, max: 20 },
    durationSlots: { type: Number, default: 1, min: 1, max: 4 },
    requiresLab: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ code: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
