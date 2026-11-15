const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Classroom = require('../models/Classroom');
const TimetableEntry = require('../models/TimetableEntry');
const { getPagination, buildSearchFilter } = require('../utils/queryHelpers');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { ...buildSearchFilter(req.query.search, ['name', 'roomNumber', 'building']) };
  if (req.query.type) filter.type = req.query.type;

  const [rows, total] = await Promise.all([
    Classroom.find(filter).sort('roomNumber').skip(skip).limit(limit),
    Classroom.countDocuments(filter),
  ]);

  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const create = asyncHandler(async (req, res) => {
  const room = await Classroom.create(req.body);
  res.status(201).json({ success: true, data: room });
});

const getOne = asyncHandler(async (req, res) => {
  const room = await Classroom.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Classroom not found');
  res.json({ success: true, data: room });
});

const update = asyncHandler(async (req, res) => {
  const room = await Classroom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) throw new ApiError(404, 'Classroom not found');
  res.json({ success: true, data: room });
});

const remove = asyncHandler(async (req, res) => {
  const inUse = await TimetableEntry.countDocuments({ classroom: req.params.id });
  if (inUse > 0) throw new ApiError(409, 'Cannot delete a classroom used in existing timetable entries');
  const room = await Classroom.findByIdAndDelete(req.params.id);
  if (!room) throw new ApiError(404, 'Classroom not found');
  res.json({ success: true, message: 'Classroom deleted' });
});

module.exports = { list, create, getOne, update, remove };
