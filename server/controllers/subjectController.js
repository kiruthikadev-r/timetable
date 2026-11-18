const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { getPagination, buildSearchFilter } = require('../utils/queryHelpers');
const logAction = require('../utils/audit');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { ...buildSearchFilter(req.query.search, ['name', 'code']) };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.semester) filter.semester = Number(req.query.semester);
  if (req.query.type) filter.type = req.query.type;

  const [rows, total] = await Promise.all([
    Subject.find(filter).populate('department', 'name code').sort('semester name').skip(skip).limit(limit),
    Subject.countDocuments(filter),
  ]);

  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const create = asyncHandler(async (req, res) => {
  const subject = await Subject.create(req.body);
  await logAction(req.user, `created subject ${subject.name}`, 'Subject', subject._id, { department: subject.department });
  res.status(201).json({ success: true, data: subject });
});

const getOne = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id).populate('department', 'name code');
  if (!subject) throw new ApiError(404, 'Subject not found');
  res.json({ success: true, data: subject });
});

const update = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!subject) throw new ApiError(404, 'Subject not found');
  res.json({ success: true, data: subject });
});

const remove = asyncHandler(async (req, res) => {
  const inUse = await Class.countDocuments({ 'subjects.subject': req.params.id });
  if (inUse > 0) throw new ApiError(409, 'Cannot delete a subject assigned to one or more classes');
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) throw new ApiError(404, 'Subject not found');
  await logAction(req.user, `deleted subject ${subject.name}`, 'Subject', subject._id, { department: subject.department });
  res.json({ success: true, message: 'Subject deleted' });
});

module.exports = { list, create, getOne, update, remove };
