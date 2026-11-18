const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const ApiError = require('../utils/ApiError');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const TimetableEntry = require('../models/TimetableEntry');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { loadSchedulingContext, generateForClass } = require('../services/timetableGenerator');
const logAction = require('../utils/audit');

const CLASS_POPULATE = [
  { path: 'department' },
  { path: 'subjects.subject' },
  { path: 'subjects.faculty' },
];

const ENTRY_POPULATE = [
  { path: 'timeSlot' },
  { path: 'subject', select: 'name code type' },
  { path: 'faculty', select: 'name facultyId' },
  { path: 'classroom', select: 'name roomNumber type' },
];

const resolveTargetClasses = async ({ classId, departmentId, all }) => {
  const filter = { isActive: true };
  if (classId) filter._id = classId;
  if (departmentId) filter.department = departmentId;
  if (!classId && !departmentId && !all) throw new ApiError(400, 'Provide classId, departmentId or all=true');
  return Class.find(filter).populate(CLASS_POPULATE);
};

// POST /api/timetables/generate  body: { classId? , departmentId?, all?, academicYear, semester }
const generate = asyncHandler(async (req, res) => {
  const { classId, departmentId, all, academicYear } = req.body;
  if (!academicYear) throw new ApiError(400, 'academicYear is required');

  const classes = await resolveTargetClasses({ classId, departmentId, all });
  if (!classes.length) throw new ApiError(404, 'No matching classes found to generate timetables for');

  // A class with an approved/published timetable already has a "live" schedule;
  // generating a second one alongside it would leave two active timetables for
  // the same class (confusing every list/report). Skip those and require an
  // explicit unpublish/regenerate instead, the same rule regenerate() enforces.
  const lockedIds = new Set(
    (await Timetable.find({ class: { $in: classes.map((c) => c._id) }, academicYear, status: { $in: ['approved', 'published'] } }).distinct('class')).map(String)
  );

  // Archive every target class's old draft/pending timetable BEFORE the
  // scheduling context is loaded, so this run's own stale entries are never
  // double-counted as conflicts against the class being regenerated.
  for (const klass of classes) {
    if (klass.subjects.length && !lockedIds.has(String(klass._id))) {
      await Timetable.updateMany({ class: klass._id, academicYear, status: { $nin: ['approved', 'published'] } }, { status: 'archived' });
    }
  }

  const ctx = await loadSchedulingContext(academicYear);
  const report = [];

  for (const klass of classes) {
    if (!klass.subjects.length) {
      report.push({ classId: klass._id, displayName: klass.displayName, status: 'skipped', reason: 'No subjects/faculty assigned to this class' });
      continue;
    }

    if (lockedIds.has(String(klass._id))) {
      report.push({
        classId: klass._id,
        displayName: klass.displayName,
        status: 'skipped',
        reason: 'This class already has an approved/published timetable. Unpublish or archive it before regenerating.',
      });
      continue;
    }

    const { entries, unresolved } = generateForClass(klass, ctx);

    const timetable = await Timetable.create({
      class: klass._id,
      department: klass.department._id,
      academicYear,
      semester: klass.semester,
      status: 'draft',
      generatedBy: req.user._id,
      unresolved,
    });

    if (entries.length) {
      await TimetableEntry.insertMany(
        entries.map((e) => ({ ...e, timetable: timetable._id, class: klass._id, department: klass.department._id }))
      );
    }

    await logAction(req.user, `generated timetable for ${klass.displayName}`, 'Timetable', timetable._id, {
      department: klass.department._id,
      details: { entriesCreated: entries.length, unresolved: unresolved.length },
    });

    report.push({
      classId: klass._id,
      displayName: klass.displayName,
      timetableId: timetable._id,
      status: unresolved.length ? 'partial' : 'success',
      entriesCreated: entries.length,
      unresolved,
    });
  }

  res.json({ success: true, data: report });
});

// POST /api/timetables/:id/regenerate
const regenerate = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  if (['approved', 'published'].includes(timetable.status)) {
    throw new ApiError(409, 'Unpublish/unapprove this timetable before regenerating it');
  }

  const klass = await Class.findById(timetable.class).populate(CLASS_POPULATE);
  if (!klass) throw new ApiError(404, 'Class not found');

  await TimetableEntry.deleteMany({ timetable: timetable._id });

  const ctx = await loadSchedulingContext(timetable.academicYear);
  const { entries, unresolved } = generateForClass(klass, ctx);

  if (entries.length) {
    await TimetableEntry.insertMany(
      entries.map((e) => ({ ...e, timetable: timetable._id, class: klass._id, department: klass.department._id }))
    );
  }

  timetable.version += 1;
  timetable.status = 'draft';
  timetable.unresolved = unresolved;
  await timetable.save();

  await logAction(req.user, `regenerated timetable for ${klass.displayName}`, 'Timetable', timetable._id, {
    department: klass.department._id,
    details: { entriesCreated: entries.length, unresolved: unresolved.length, version: timetable.version },
  });

  res.json({ success: true, data: { timetableId: timetable._id, entriesCreated: entries.length, unresolved } });
});

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.class) filter.class = req.query.class;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.semester) filter.semester = Number(req.query.semester);

  const rows = await Timetable.find(filter)
    .populate('class', 'programme section semester strength')
    .populate('department', 'name code')
    .sort('-createdAt');

  res.json({ success: true, data: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id)
    .populate('class')
    .populate('department', 'name code');
  if (!timetable) throw new ApiError(404, 'Timetable not found');

  const entries = await TimetableEntry.find({ timetable: timetable._id }).populate(ENTRY_POPULATE);
  res.json({ success: true, data: { timetable, entries } });
});

const getByFaculty = asyncHandler(async (req, res) => {
  const filter = { faculty: req.params.facultyId };
  const entries = await TimetableEntry.find(filter)
    .populate(ENTRY_POPULATE)
    .populate('class', 'programme section semester')
    .populate({ path: 'timetable', select: 'status' });

  const published = entries.filter((e) => e.timetable?.status === 'published');
  res.json({ success: true, data: published });
});

const conflictsForEntries = async (candidateEntries, excludeTimetableId) => {
  const conflicts = [];
  for (const e of candidateEntries) {
    const facultyClash = await TimetableEntry.findOne({
      _id: { $ne: e._id },
      timetable: { $ne: excludeTimetableId },
      day: e.day,
      timeSlot: e.timeSlot,
      faculty: e.faculty,
    }).populate('timetable', 'status');
    if (facultyClash && facultyClash.timetable?.status !== 'archived') conflicts.push({ type: 'faculty', entry: e });

    const roomClash = await TimetableEntry.findOne({
      _id: { $ne: e._id },
      timetable: { $ne: excludeTimetableId },
      day: e.day,
      timeSlot: e.timeSlot,
      classroom: e.classroom,
    }).populate('timetable', 'status');
    if (roomClash && roomClash.timetable?.status !== 'archived') conflicts.push({ type: 'classroom', entry: e });
  }
  return conflicts;
};

// PUT /api/timetables/entries/:entryId
const updateEntry = asyncHandler(async (req, res) => {
  const entry = await TimetableEntry.findById(req.params.entryId);
  if (!entry) throw new ApiError(404, 'Timetable entry not found');

  const { day, timeSlot, faculty, classroom, subject } = req.body;
  const updated = { ...entry.toObject(), day, timeSlot, faculty, classroom, subject };

  const clash = await TimetableEntry.findOne({
    _id: { $ne: entry._id },
    class: entry.class,
    day: updated.day,
    timeSlot: updated.timeSlot,
  });
  if (clash) throw new ApiError(409, 'This class already has a session scheduled at that day/time');

  const otherClashes = await conflictsForEntries([{ ...updated, _id: entry._id }], entry.timetable);
  if (otherClashes.length) {
    throw new ApiError(409, `Scheduling conflict: ${otherClashes[0].type} is already booked at that day/time`);
  }

  Object.assign(entry, { day, timeSlot, faculty, classroom, subject });
  await entry.save();
  await entry.populate(ENTRY_POPULATE);

  await logAction(req.user, 'edited a timetable session', 'TimetableEntry', entry._id, { department: entry.department });

  res.json({ success: true, data: entry });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await TimetableEntry.findByIdAndDelete(req.params.entryId);
  if (!entry) throw new ApiError(404, 'Timetable entry not found');

  await logAction(req.user, 'removed a timetable session', 'TimetableEntry', entry._id, { department: entry.department });

  res.json({ success: true, message: 'Entry deleted' });
});

const notifyRole = async (role, departmentId, title, message, type, timetableId) => {
  const users = await User.find({ role, ...(departmentId ? { department: departmentId } : {}) });
  if (users.length) {
    await Notification.insertMany(users.map((u) => ({ user: u._id, title, message, type, relatedTimetable: timetableId })));
  }
};

const submitForApproval = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id).populate('department', 'name');
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  timetable.status = 'pending_approval';
  await timetable.save();

  await notifyRole('hod', timetable.department._id, 'Timetable approval requested', `A timetable for ${timetable.department.name} is awaiting your review.`, 'approval_request', timetable._id);
  await logAction(req.user, 'submitted timetable for approval', 'Timetable', timetable._id, { department: timetable.department._id });
  res.json({ success: true, data: timetable });
});

const approve = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  timetable.status = 'approved';
  timetable.reviewedBy = req.user._id;
  timetable.reviewNote = req.body.note || '';
  await timetable.save();
  await logAction(req.user, 'approved a timetable', 'Timetable', timetable._id, { department: timetable.department });
  res.json({ success: true, data: timetable });
});

const reject = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id).populate('generatedBy');
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  timetable.status = 'draft';
  timetable.reviewedBy = req.user._id;
  timetable.reviewNote = req.body.note || 'Changes requested';
  await timetable.save();

  if (timetable.generatedBy) {
    await Notification.create({
      user: timetable.generatedBy._id,
      title: 'Timetable changes requested',
      message: timetable.reviewNote,
      type: 'timetable_rejected',
      relatedTimetable: timetable._id,
    });
  }
  await logAction(req.user, 'requested changes to a timetable', 'Timetable', timetable._id, { department: timetable.department, details: { note: timetable.reviewNote } });
  res.json({ success: true, data: timetable });
});

const publish = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id).populate('class', 'programme section semester');
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  if (timetable.status !== 'approved') throw new ApiError(409, 'Only an approved timetable can be published');

  timetable.status = 'published';
  timetable.publishedBy = req.user._id;
  timetable.publishedAt = new Date();
  await timetable.save();

  const entries = await TimetableEntry.find({ timetable: timetable._id }).select('faculty');
  const facultyIds = [...new Set(entries.map((e) => String(e.faculty)))];
  const facultyUsers = await User.find({ faculty: { $in: facultyIds } });
  if (facultyUsers.length) {
    await Notification.insertMany(
      facultyUsers.map((u) => ({
        user: u._id,
        title: 'Timetable published',
        message: `The timetable for ${timetable.class.programme} Sem ${timetable.class.semester} ${timetable.class.section} has been published.`,
        type: 'timetable_published',
        relatedTimetable: timetable._id,
      }))
    );
  }

  await logAction(req.user, `published timetable for ${timetable.class.programme} Sem ${timetable.class.semester} ${timetable.class.section}`, 'Timetable', timetable._id, { department: timetable.department });

  res.json({ success: true, data: timetable });
});

const unpublish = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  timetable.status = 'approved';
  timetable.publishedBy = null;
  timetable.publishedAt = null;
  await timetable.save();
  await logAction(req.user, 'unpublished a timetable', 'Timetable', timetable._id, { department: timetable.department });
  res.json({ success: true, data: timetable });
});

const archive = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  await logAction(req.user, 'archived a timetable', 'Timetable', timetable._id, { department: timetable.department });
  res.json({ success: true, data: timetable });
});

// GET /api/timetables/:id/export-pdf
const exportPdf = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id).populate('class', 'programme section semester');
  if (!timetable) throw new ApiError(404, 'Timetable not found');

  const entries = await TimetableEntry.find({ timetable: timetable._id }).populate(ENTRY_POPULATE);
  const byDaySlot = new Map(entries.map((e) => [`${e.day}|${e.timeSlot._id}`, e]));
  const slots = [...new Map(entries.map((e) => [String(e.timeSlot._id), e.timeSlot])).values()].sort((a, b) => a.order - b.order);
  const days = [...new Set(entries.map((e) => e.day))];

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="timetable-${timetable.class.programme}-${timetable.class.section}.pdf"`);

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  doc.fontSize(16).text(`${timetable.class.programme} - Sem ${timetable.class.semester} - ${timetable.class.section}`, { align: 'center' });
  doc.moveDown();

  const colWidth = 130;
  let y = doc.y;
  doc.fontSize(9).text('Day / Period', 30, y, { width: 90 });
  slots.forEach((s, i) => doc.text(s.label, 120 + i * colWidth, y, { width: colWidth }));

  days.forEach((day) => {
    y += 24;
    doc.text(day, 30, y, { width: 90 });
    slots.forEach((s, i) => {
      const entry = byDaySlot.get(`${day}|${s._id}`);
      const text = entry ? `${entry.subject.code}\n${entry.faculty.name}\n${entry.classroom.roomNumber}` : '-';
      doc.text(text, 120 + i * colWidth, y, { width: colWidth });
    });
  });

  doc.end();
});

module.exports = {
  generate,
  regenerate,
  list,
  getOne,
  getByFaculty,
  updateEntry,
  deleteEntry,
  submitForApproval,
  approve,
  reject,
  publish,
  unpublish,
  archive,
  exportPdf,
};
