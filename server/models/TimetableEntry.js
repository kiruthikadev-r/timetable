const mongoose = require('mongoose');
const { DAYS } = require('./Faculty');

const timetableEntrySchema = new mongoose.Schema(
  {
    timetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    day: { type: String, enum: DAYS, required: true },
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  },
  { timestamps: true }
);

timetableEntrySchema.index({ timetable: 1, day: 1, timeSlot: 1 });
timetableEntrySchema.index({ faculty: 1, day: 1, timeSlot: 1 });
timetableEntrySchema.index({ classroom: 1, day: 1, timeSlot: 1 });

module.exports = mongoose.model('TimetableEntry', timetableEntrySchema);
