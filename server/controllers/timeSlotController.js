const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const TimeSlot = require('../models/TimeSlot');
const Settings = require('../models/Settings');

const list = asyncHandler(async (req, res) => {
  const slots = await TimeSlot.find().sort('order');
  res.json({ success: true, data: slots });
});

const create = asyncHandler(async (req, res) => {
  const slot = await TimeSlot.create(req.body);
  res.status(201).json({ success: true, data: slot });
});

const update = asyncHandler(async (req, res) => {
  const slot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!slot) throw new ApiError(404, 'Time slot not found');
  res.json({ success: true, data: slot });
});

const remove = asyncHandler(async (req, res) => {
  const slot = await TimeSlot.findByIdAndDelete(req.params.id);
  if (!slot) throw new ApiError(404, 'Time slot not found');
  res.json({ success: true, message: 'Time slot deleted' });
});

const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  res.json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { workingDays, collegeStartTime, collegeEndTime } = req.body;
  const settings = await Settings.findOneAndUpdate(
    { key: 'global' },
    { workingDays, collegeStartTime, collegeEndTime },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ success: true, data: settings });
});

module.exports = { list, create, update, remove, getSettings, updateSettings };
