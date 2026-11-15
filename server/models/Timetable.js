const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    semester: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'published', 'archived'],
      default: 'draft',
    },
    version: { type: Number, default: 1 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    unresolved: { type: [String], default: [] },
  },
  { timestamps: true }
);

timetableSchema.index({ class: 1, status: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
