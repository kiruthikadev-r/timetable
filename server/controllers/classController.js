const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const TimetableEntry = require('../models/TimetableEntry');
const { getPagination } = require('../utils/queryHelpers');
const logAction = require('../utils/audit');

const POPULATE = [
  { path: 'department', select: 'name code' },
  { path: 'academicYear', select: 'name' },
  { path: 'classTeacher', select: 'name facultyId' },
  { path: 'subjects.subject', select: 'name code type weeklyPeriods durationSlots' },
  { path: 'subjects.faculty', select: 'name facultyId' },
];

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.semester) filter.semester = Number(req.query.semester);

  const [rows, total] = await Promise.all([
    Class.find(filter).populate(POPULATE).sort('programme semester section').skip(skip).limit(limit),
    Class.countDocuments(filter),
  ]);

  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const create = asyncHandler(async (req, res) => {
  const klass = await Class.create(req.body);
  await klass.populate(POPULATE);
  await logAction(req.user, `created class ${klass.displayName}`, 'Class', klass._id, { department: klass.department._id });
  res.status(201).json({ success: true, data: klass });
});

const getOne = asyncHandler(async (req, res) => {
  const klass = await Class.findById(req.params.id).populate(POPULATE);
  if (!klass) throw new ApiError(404, 'Class not found');
  res.json({ success: true, data: klass });
});

// Timetable edits are only allowed while the class's timetable is still in
// draft/pending_approval; once approved/published, curriculum edits would
// silently desync an already-reviewed schedule, so lock them.
const assertEditable = async (classId) => {
  const locked = await Timetable.findOne({ class: classId, status: { $in: ['approved', 'published'] } });
  if (locked) throw new ApiError(409, 'This class has an approved/published timetable. Unpublish or archive it before editing the class.');
};

const update = asyncHandler(async (req, res) => {
  await assertEditable(req.params.id);
  const klass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(POPULATE);
  if (!klass) throw new ApiError(404, 'Class not found');
  await logAction(req.user, `updated class ${klass.displayName}`, 'Class', klass._id, { department: klass.department._id });
  res.json({ success: true, data: klass });
});

const remove = asyncHandler(async (req, res) => {
  const inUse = await TimetableEntry.countDocuments({ class: req.params.id });
  if (inUse > 0) throw new ApiError(409, 'Cannot delete a class that has timetable entries. Archive its timetable first.');
  const klass = await Class.findByIdAndDelete(req.params.id);
  if (!klass) throw new ApiError(404, 'Class not found');
  await logAction(req.user, `deleted class ${klass.displayName}`, 'Class', klass._id, { department: klass.department });
  res.json({ success: true, message: 'Class deleted' });
});

module.exports = { list, create, getOne, update, remove };
