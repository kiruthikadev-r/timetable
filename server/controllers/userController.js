const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { getPagination, buildSearchFilter } = require('../utils/queryHelpers');
const logAction = require('../utils/audit');

const sanitize = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department,
  faculty: u.faculty,
  isActive: u.isActive,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { ...buildSearchFilter(req.query.search, ['name', 'email']) };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.department) filter.department = req.query.department;

  const [rows, total] = await Promise.all([
    User.find(filter).populate('department', 'name code').sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: rows.map(sanitize),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, faculty } = req.body;
  if (!name || !email || !password || !role) throw new ApiError(400, 'name, email, password and role are required');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, 'A user with this email already exists');

  const user = await User.create({ name, email, password, role, department: department || null, faculty: faculty || null });
  await logAction(req.user, `created a ${role} account for ${user.name}`, 'User', user._id, { department: user.department });
  res.status(201).json({ success: true, data: sanitize(user) });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('department', 'name code');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: sanitize(user) });
});

const update = asyncHandler(async (req, res) => {
  const { name, role, department, faculty, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (department !== undefined) user.department = department || null;
  if (faculty !== undefined) user.faculty = faculty || null;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();
  res.json({ success: true, data: sanitize(user) });
});

const remove = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, message: 'User deleted' });
});

module.exports = { list, create, getOne, update, remove };
