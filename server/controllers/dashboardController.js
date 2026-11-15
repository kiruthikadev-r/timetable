const asyncHandler = require('express-async-handler');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const TimetableEntry = require('../models/TimetableEntry');
const AuditLog = require('../models/AuditLog');

const summary = asyncHandler(async (req, res) => {
  const deptFilter = {};
  if (req.user.role !== 'superadmin' && req.user.department) {
    deptFilter.department = req.user.department;
  }

  const [departments, faculty, classes, subjects, classrooms, publishedTimetables, totalPeriods] = await Promise.all([
    req.user.role === 'superadmin' ? Department.countDocuments() : Promise.resolve(null),
    Faculty.countDocuments(deptFilter),
    Class.countDocuments(deptFilter),
    Subject.countDocuments(deptFilter),
    req.user.role === 'superadmin' ? Classroom.countDocuments() : Promise.resolve(null),
    Timetable.countDocuments({ ...deptFilter, status: 'published' }),
    TimetableEntry.countDocuments(deptFilter),
  ]);

  const totalClasses = await Class.countDocuments(deptFilter);
  const completionPercent = totalClasses ? Math.round((publishedTimetables / totalClasses) * 100) : 0;

  const byDepartment = await Class.aggregate([
    { $match: deptFilter },
    {
      $lookup: {
        from: 'timetables',
        let: { classId: '$_id' },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$class', '$$classId'] }, { $eq: ['$status', 'published'] }] } } }],
        as: 'published',
      },
    },
    { $group: { _id: '$department', total: { $sum: 1 }, published: { $sum: { $cond: [{ $gt: [{ $size: '$published' }, 0] }, 1, 0] } } } },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
    { $unwind: '$department' },
    { $project: { _id: 0, department: '$department.name', total: 1, published: 1 } },
  ]);

  const recentActivity = await AuditLog.find(deptFilter.department ? {} : {})
    .sort('-createdAt')
    .limit(10)
    .populate('user', 'name role');

  res.json({
    success: true,
    data: {
      departments,
      faculty,
      classes,
      subjects,
      classrooms,
      publishedTimetables,
      totalPeriods,
      completionPercent,
      byDepartment,
      recentActivity,
    },
  });
});

module.exports = { summary };
