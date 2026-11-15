const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const AcademicYear = require('../models/AcademicYear');

const list = asyncHandler(async (req, res) => {
  const years = await AcademicYear.find().sort('-startDate');
  res.json({ success: true, data: years });
});

const create = asyncHandler(async (req, res) => {
  const year = await AcademicYear.create(req.body);
  res.status(201).json({ success: true, data: year });
});

const update = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!year) throw new ApiError(404, 'Academic year not found');
  res.json({ success: true, data: year });
});

const remove = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findByIdAndDelete(req.params.id);
  if (!year) throw new ApiError(404, 'Academic year not found');
  res.json({ success: true, message: 'Academic year deleted' });
});

module.exports = { list, create, update, remove };
