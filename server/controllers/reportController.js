const asyncHandler = require('express-async-handler');
const ExcelJS = require('exceljs');
const TimetableEntry = require('../models/TimetableEntry');
const Timetable = require('../models/Timetable');
const Classroom = require('../models/Classroom');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Class = require('../models/Class');

const activeTimetableIds = async (filter = {}) => {
  const ids = await Timetable.find({ status: { $ne: 'archived' }, ...filter }).distinct('_id');
  return ids;
};

// GET /api/reports/faculty-workload?department=
const facultyWorkload = asyncHandler(async (req, res) => {
  const filter = req.query.department ? { department: req.query.department } : {};
  const timetableIds = await activeTimetableIds(filter);

  const rows = await TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$faculty', periods: { $sum: 1 } } },
    { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
    { $unwind: '$faculty' },
    { $project: { _id: 0, facultyId: '$faculty._id', name: '$faculty.name', code: '$faculty.facultyId', maxWeeklyHours: '$faculty.maxWeeklyHours', periods: 1 } },
    { $sort: { periods: -1 } },
  ]);

  res.json({ success: true, data: rows });
});

// GET /api/reports/classroom-utilization
const classroomUtilization = asyncHandler(async (req, res) => {
  const totalSlotsPerWeek = Number(req.query.totalSlots) || 36;
  const timetableIds = await activeTimetableIds();

  const usage = await TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$classroom', periods: { $sum: 1 } } },
  ]);
  const usageMap = new Map(usage.map((u) => [String(u._id), u.periods]));

  const rooms = await Classroom.find();
  const data = rooms.map((r) => {
    const periods = usageMap.get(String(r._id)) || 0;
    return {
      roomId: r._id,
      name: r.name,
      roomNumber: r.roomNumber,
      type: r.type,
      periods,
      utilizationPercent: Math.round((periods / totalSlotsPerWeek) * 100),
    };
  });

  res.json({ success: true, data });
});

// GET /api/reports/subject-allocation?department=
const subjectAllocation = asyncHandler(async (req, res) => {
  const filter = req.query.department ? { department: req.query.department } : {};
  const subjects = await Subject.find(filter);
  const timetableIds = await activeTimetableIds();

  const scheduled = await TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$subject', periods: { $sum: 1 } } },
  ]);
  const scheduledMap = new Map(scheduled.map((s) => [String(s._id), s.periods]));

  const data = subjects.map((s) => ({
    subjectId: s._id,
    name: s.name,
    code: s.code,
    required: s.weeklyPeriods,
    scheduled: scheduledMap.get(String(s._id)) || 0,
  }));

  res.json({ success: true, data });
});

// GET /api/reports/unassigned-subjects
const unassignedSubjects = asyncHandler(async (req, res) => {
  const classes = await Class.find().populate('subjects.subject', 'name code weeklyPeriods').populate('department', 'name');
  const data = [];
  classes.forEach((c) => {
    c.subjects.forEach((s) => {
      if (!s.faculty) data.push({ class: c.displayName, department: c.department?.name, subject: s.subject?.name });
    });
  });
  res.json({ success: true, data });
});

// GET /api/reports/timetable-completion
const timetableCompletion = asyncHandler(async (req, res) => {
  const classes = await Class.find({ isActive: true }).populate('department', 'name');
  const timetables = await Timetable.find({ status: { $ne: 'archived' } }).sort('-createdAt');
  const latestByClass = new Map();
  timetables.forEach((t) => {
    if (!latestByClass.has(String(t.class))) latestByClass.set(String(t.class), t);
  });

  const data = classes.map((c) => {
    const t = latestByClass.get(String(c._id));
    return {
      classId: c._id,
      displayName: c.displayName,
      department: c.department?.name,
      status: t ? t.status : 'not_generated',
      unresolvedCount: t ? t.unresolved.length : 0,
    };
  });

  const completed = data.filter((d) => d.status === 'published').length;
  res.json({ success: true, data: { classes: data, completionPercent: data.length ? Math.round((completed / data.length) * 100) : 0 } });
});

// GET /api/reports/class-schedule/:classId
const classSchedule = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findOne({ class: req.params.classId, status: { $ne: 'archived' } }).sort('-createdAt');
  if (!timetable) return res.json({ success: true, data: [] });
  const entries = await TimetableEntry.find({ timetable: timetable._id })
    .populate('timeSlot')
    .populate('subject', 'name code type')
    .populate('faculty', 'name facultyId')
    .populate('classroom', 'name roomNumber');
  res.json({ success: true, data: entries });
});

const REPORT_COLUMNS = {
  'faculty-workload': [
    { header: 'Faculty', key: 'name' },
    { header: 'Code', key: 'code' },
    { header: 'Weekly Periods', key: 'periods' },
    { header: 'Max Weekly Hours', key: 'maxWeeklyHours' },
  ],
  'classroom-utilization': [
    { header: 'Room', key: 'name' },
    { header: 'Room No', key: 'roomNumber' },
    { header: 'Type', key: 'type' },
    { header: 'Periods Used', key: 'periods' },
    { header: 'Utilization %', key: 'utilizationPercent' },
  ],
  'subject-allocation': [
    { header: 'Subject', key: 'name' },
    { header: 'Code', key: 'code' },
    { header: 'Required/Week', key: 'required' },
    { header: 'Scheduled/Week', key: 'scheduled' },
  ],
};

const REPORT_LOADERS = {
  'faculty-workload': (req) => facultyWorkloadRows(req),
  'classroom-utilization': () => classroomUtilizationRows(),
  'subject-allocation': (req) => subjectAllocationRows(req),
};

// The handlers above write their own res.json; pull the same aggregation logic
// out so the Excel export can reuse it without an HTTP round-trip.
async function facultyWorkloadRows(req) {
  const filter = req.query.department ? { department: req.query.department } : {};
  const timetableIds = await activeTimetableIds(filter);
  return TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$faculty', periods: { $sum: 1 } } },
    { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
    { $unwind: '$faculty' },
    { $project: { _id: 0, name: '$faculty.name', code: '$faculty.facultyId', maxWeeklyHours: '$faculty.maxWeeklyHours', periods: 1 } },
    { $sort: { periods: -1 } },
  ]);
}

async function classroomUtilizationRows() {
  const timetableIds = await activeTimetableIds();
  const usage = await TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$classroom', periods: { $sum: 1 } } },
  ]);
  const usageMap = new Map(usage.map((u) => [String(u._id), u.periods]));
  const rooms = await Classroom.find();
  return rooms.map((r) => {
    const periods = usageMap.get(String(r._id)) || 0;
    return { name: r.name, roomNumber: r.roomNumber, type: r.type, periods, utilizationPercent: Math.round((periods / 36) * 100) };
  });
}

async function subjectAllocationRows(req) {
  const filter = req.query.department ? { department: req.query.department } : {};
  const subjects = await Subject.find(filter);
  const timetableIds = await activeTimetableIds();
  const scheduled = await TimetableEntry.aggregate([
    { $match: { timetable: { $in: timetableIds } } },
    { $group: { _id: '$subject', periods: { $sum: 1 } } },
  ]);
  const scheduledMap = new Map(scheduled.map((s) => [String(s._id), s.periods]));
  return subjects.map((s) => ({ name: s.name, code: s.code, required: s.weeklyPeriods, scheduled: scheduledMap.get(String(s._id)) || 0 }));
}

// GET /api/reports/export?report=faculty-workload|classroom-utilization|subject-allocation&format=excel
const exportReport = asyncHandler(async (req, res) => {
  const { report } = req.query;
  const loader = REPORT_LOADERS[report];
  if (!loader) return res.status(400).json({ success: false, message: 'Unknown report type' });

  const rows = await loader(req);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report);
  sheet.columns = REPORT_COLUMNS[report];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));
  sheet.columns.forEach((c) => { c.width = 22; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${report}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  facultyWorkload,
  classroomUtilization,
  subjectAllocation,
  unassignedSubjects,
  timetableCompletion,
  classSchedule,
  exportReport,
};
