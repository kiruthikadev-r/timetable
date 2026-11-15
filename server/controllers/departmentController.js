const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Class = require('../models/Class');
const { getPagination, buildSearchFilter } = require('../utils/queryHelpers');

const withCounts = async (departments) => {
  const ids = departments.map((d) => d._id);
  const [facultyCounts, classCounts] = await Promise.all([
    Faculty.aggregate([{ $match: { department: { $in: ids } } }, { $group: { _id: '$department', count: { $sum: 1 } } }]),
    Class.aggregate([{ $match: { department: { $in: ids } } }, { $group: { _id: '$department', count: { $sum: 1 } } }]),
  ]);
  const facultyMap = new Map(facultyCounts.map((f) => [String(f._id), f.count]));
  const classMap = new Map(classCounts.map((c) => [String(c._id), c.count]));

  return departments.map((d) => ({
    ...d.toObject(),
    facultyCount: facultyMap.get(String(d._id)) || 0,
    classCount: classMap.get(String(d._id)) || 0,
  }));
};

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = buildSearchFilter(req.query.search, ['name', 'code']);

  const [rows, total] = await Promise.all([
    Department.find(filter).populate('hod', 'name email').sort('name').skip(skip).limit(limit),
    Department.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: await withCounts(rows),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const create = asyncHandler(async (req, res) => {
  const { name, code, hod, description } = req.body;
  if (!name || !code) throw new ApiError(400, 'name and code are required');
  const dept = await Department.create({ name, code, hod: hod || null, description });
  res.status(201).json({ success: true, data: dept });
});

const getOne = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id).populate('hod', 'name email');
  if (!dept) throw new ApiError(404, 'Department not found');
  const [withCount] = await withCounts([dept]);
  res.json({ success: true, data: withCount });
});

const update = asyncHandler(async (req, res) => {
  const { name, code, hod, description, isActive } = req.body;
  const dept = await Department.findById(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found');

  if (name !== undefined) dept.name = name;
  if (code !== undefined) dept.code = code;
  if (hod !== undefined) dept.hod = hod || null;
  if (description !== undefined) dept.description = description;
  if (isActive !== undefined) dept.isActive = isActive;

  await dept.save();
  res.json({ success: true, data: dept });
});

const remove = asyncHandler(async (req, res) => {
  const [facultyCount, classCount] = await Promise.all([
    Faculty.countDocuments({ department: req.params.id }),
    Class.countDocuments({ department: req.params.id }),
  ]);
  if (facultyCount > 0 || classCount > 0) {
    throw new ApiError(409, 'Cannot delete a department that still has faculty or classes assigned to it');
  }
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found');
  res.json({ success: true, message: 'Department deleted' });
});

module.exports = { list, create, getOne, update, remove };
