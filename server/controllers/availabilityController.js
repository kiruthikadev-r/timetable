const asyncHandler = require('express-async-handler');
const FacultyAvailability = require('../models/FacultyAvailability');

const listByFaculty = asyncHandler(async (req, res) => {
  const rows = await FacultyAvailability.find({ faculty: req.params.facultyId }).populate('timeSlot');
  res.json({ success: true, data: rows });
});

// body: { facultyId, entries: [{ day, timeSlot, status }] }
// Replaces the full availability exception set for a faculty member in one call.
const setAvailability = asyncHandler(async (req, res) => {
  const { facultyId, entries } = req.body;

  await FacultyAvailability.deleteMany({ faculty: facultyId });
  const docs = (entries || []).map((e) => ({ faculty: facultyId, day: e.day, timeSlot: e.timeSlot, status: e.status }));
  const created = docs.length ? await FacultyAvailability.insertMany(docs) : [];

  res.json({ success: true, data: created });
});

module.exports = { listByFaculty, setAvailability };
