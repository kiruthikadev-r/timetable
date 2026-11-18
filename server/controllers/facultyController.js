const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Faculty = require('../models/Faculty');
const Class = require('../models/Class');
const TimetableEntry = require('../models/TimetableEntry');
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

const getOne = asyncHandler(async (req, res) => {
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

  const weeklyHours = await TimetableEntry.countDocuments({ faculty: faculty._id });

  res.json({ success: true, data: { ...faculty.toObject(), assignments, weeklyHours } });
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
