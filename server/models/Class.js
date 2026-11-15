const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    programme: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    strength: { type: Number, default: 0, min: 0 },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
    subjects: { type: [classSubjectSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.virtual('displayName').get(function displayName() {
  return `${this.programme} - Sem ${this.semester} - ${this.section}`;
});
classSchema.set('toJSON', { virtuals: true });

classSchema.index({ department: 1, academicYear: 1, semester: 1, section: 1, programme: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
