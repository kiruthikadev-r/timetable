const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true, unique: true },
    building: { type: String, trim: true, default: '' },
    floor: { type: String, trim: true, default: '' },
    capacity: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: ['Classroom', 'Computer Lab', 'Science Lab', 'Seminar Hall'],
      default: 'Classroom',
    },
    equipment: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Classroom', classroomSchema);
