const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Faculty = require('../models/Faculty');
const Class = require('../models/Class');
const TimetableEntry = require('../models/TimetableEntry');
const Timetable = require('../models/Timetable');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const { getPagination, buildSearchFilter } = require('../utils/queryHelpers');
const logAction = require('../utils/audit');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { ...buildSearchFilter(req.query.search, ['name', 'email', 'facultyId']) };
  if (req.query.department) filter.department = req.query.department;

  const [rows, total] = await Promise.all([
    Faculty.find(filter).populate('department', 'name code').sort('name').skip(skip).limit(limit),
    Faculty.countDocuments(filter),
  ]);

  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const create = asyncHandler(async (req, res) => {
  const faculty = await Faculty.create(req.body);
  await logAction(req.user, `added faculty ${faculty.name}`, 'Faculty', faculty._id, { department: faculty.department });
  res.status(201).json({ success: true, data: faculty });
});

// A faculty login may only look up their own record this way; HOD/superadmin can look up anyone.
const assertCanView = (req, facultyId) => {
  if (req.user.role === 'faculty' && String(req.user.faculty) !== String(facultyId)) {
    throw new ApiError(403, 'You can only view your own faculty profile');
  }
};

const getOne = asyncHandler(async (req, res) => {
  assertCanView(req, req.params.id);

  const faculty = await Faculty.findById(req.params.id).populate('department', 'name code');
  if (!faculty) throw new ApiError(404, 'Faculty not found');

  const classes = await Class.find({ 'subjects.faculty': faculty._id })
    .populate('department', 'name code')
    .populate('subjects.subject', 'name code type weeklyPeriods');

  const assignments = [];
  classes.forEach((c) => {
    c.subjects
      .filter((s) => String(s.faculty) === String(faculty._id))
      .forEach((s) => assignments.push({ class: { id: c._id, displayName: c.displayName }, subject: s.subject }));
  });

  const activeTimetableIds = await Timetable.find({ status: { $ne: 'archived' } }).distinct('_id');
  const entries = await TimetableEntry.find({ faculty: faculty._id, timetable: { $in: activeTimetableIds } }).select('classroom');
  const roomIds = [...new Set(entries.map((e) => String(e.classroom)))];
  const classroomsUsed = await Classroom.find({ _id: { $in: roomIds } }).select('name roomNumber type building floor capacity');

  res.json({ success: true, data: { ...faculty.toObject(), assignments, weeklyHours: entries.length, classroomsUsed } });
});

const update = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!faculty) throw new ApiError(404, 'Faculty not found');
  await logAction(req.user, `updated faculty ${faculty.name}`, 'Faculty', faculty._id, { department: faculty.department });
  res.json({ success: true, data: faculty });
});

const remove = asyncHandler(async (req, res) => {
  const inUse = await Class.countDocuments({ 'subjects.faculty': req.params.id });
  if (inUse > 0) throw new ApiError(409, 'Cannot delete a faculty member assigned to classes. Reassign first.');
  await User.updateMany({ faculty: req.params.id }, { $set: { faculty: null, isActive: false } });
  const faculty = await Faculty.findByIdAndDelete(req.params.id);
  if (!faculty) throw new ApiError(404, 'Faculty not found');
  await logAction(req.user, `deleted faculty ${faculty.name}`, 'Faculty', faculty._id, { department: faculty.department });
  res.json({ success: true, message: 'Faculty deleted' });
});

module.exports = { list, create, getOne, update, remove };
