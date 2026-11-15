const TimeSlot = require('../models/TimeSlot');
const Settings = require('../models/Settings');
const Classroom = require('../models/Classroom');
const FacultyAvailability = require('../models/FacultyAvailability');
const Timetable = require('../models/Timetable');
const TimetableEntry = require('../models/TimetableEntry');
const { DAYS } = require('../models/Faculty');

const MAX_BACKTRACK_STEPS = 20000;
const key = (day, slotId) => `${day}|${slotId}`;

async function loadSchedulingContext(academicYearId) {
  const [fullSlotsRaw, settings, classrooms, availabilityRaw] = await Promise.all([
    TimeSlot.find({ isActive: true }).sort('order'),
    Settings.findOne({ key: 'global' }),
    Classroom.find({ isActive: true }),
    FacultyAvailability.find({ status: 'unavailable' }),
  ]);

  const workingDaySet = new Set((settings && settings.workingDays) || DAYS);
  const workingDays = DAYS.filter((d) => workingDaySet.has(d));
  const fullSlots = fullSlotsRaw.sort((a, b) => a.order - b.order);
  const periodSlots = fullSlots.filter((s) => s.type === 'period');

  const unavailable = new Set(
    availabilityRaw.map((a) => `${a.faculty}|${a.day}|${a.timeSlot}`)
  );

  // Seed global occupancy from every non-archived timetable already in this
  // academic year, so classes generated in earlier calls (or earlier in this
  // same batch) are respected as real conflicts, not just in-memory state.
  const existingTimetables = await Timetable.find({ academicYear: academicYearId, status: { $ne: 'archived' } }).select('_id');
  const existingEntries = await TimetableEntry.find({ timetable: { $in: existingTimetables.map((t) => t._id) } });

  const facultyBusy = new Map();
  const roomBusy = new Map();
  const facultyWeeklyCount = new Map();
  const facultyDayOrders = new Map();

  const slotByOrder = new Map(fullSlots.map((s) => [String(s._id), s.order]));

  const record = (entry) => {
    const fKey = key(entry.day, String(entry.timeSlot));
    const rKey = key(entry.day, String(entry.timeSlot));
    if (!facultyBusy.has(fKey)) facultyBusy.set(fKey, new Set());
    facultyBusy.get(fKey).add(String(entry.faculty));
    if (!roomBusy.has(rKey)) roomBusy.set(rKey, new Set());
    roomBusy.get(rKey).add(String(entry.classroom));

    facultyWeeklyCount.set(String(entry.faculty), (facultyWeeklyCount.get(String(entry.faculty)) || 0) + 1);

    const dKey = `${entry.faculty}|${entry.day}`;
    if (!facultyDayOrders.has(dKey)) facultyDayOrders.set(dKey, new Set());
    facultyDayOrders.get(dKey).add(slotByOrder.get(String(entry.timeSlot)));
  };

  existingEntries.forEach(record);

  return {
    fullSlots,
    periodSlots,
    classrooms,
    workingDays,
    unavailable,
    facultyBusy,
    roomBusy,
    facultyWeeklyCount,
    facultyDayOrders,
    record,
  };
}

function longestConsecutiveRun(orderSet) {
  const orders = [...orderSet].sort((a, b) => a - b);
  let best = 0;
  let current = 0;
  let prev = null;
  orders.forEach((o) => {
    current = prev !== null && o === prev + 1 ? current + 1 : 1;
    best = Math.max(best, current);
    prev = o;
  });
  return best;
}

function buildSessionList(klass) {
  const sessions = [];
  klass.subjects.forEach(({ subject, faculty }) => {
    const length = Math.max(subject.durationSlots || 1, 1);
    const requiresLabRoom = subject.type !== 'Theory';
    const occurrences = length > 1 ? Math.ceil(subject.weeklyPeriods / length) : subject.weeklyPeriods;

    for (let i = 0; i < occurrences; i += 1) {
      sessions.push({
        subjectId: String(subject._id),
        subjectLabel: `${subject.name} (${subject.code})`,
        facultyId: faculty,
        length,
        requiresLabRoom,
      });
    }
  });
  // Longer / less flexible sessions are the hardest to place, so schedule them first.
  sessions.sort((a, b) => b.length - a.length);
  return sessions;
}

function contiguousBlocks(fullSlots, periodSlots, length) {
  const orderIndex = new Map(fullSlots.map((s, idx) => [String(s._id), idx]));
  const blocks = [];
  for (let i = 0; i + length <= periodSlots.length; i += 1) {
    const block = periodSlots.slice(i, i + length);
    const firstIdx = orderIndex.get(String(block[0]._id));
    const lastIdx = orderIndex.get(String(block[block.length - 1]._id));
    if (lastIdx - firstIdx + 1 === length) blocks.push(block);
  }
  return blocks;
}

function generateForClass(klass, ctx) {
  const sessions = buildSessionList(klass);
  const { fullSlots, periodSlots, classrooms, workingDays, unavailable } = ctx;
  const facultyMap = new Map(klass.subjects.map((s) => [String(s.faculty._id), s.faculty]));

  const localClassBusy = new Set();
  const localDayLoad = new Map(workingDays.map((d) => [d, 0]));
  const placements = [];
  const unresolved = [];
  let steps = 0;

  const blocksByLength = new Map();
  const blocksFor = (length) => {
    if (!blocksByLength.has(length)) blocksByLength.set(length, contiguousBlocks(fullSlots, periodSlots, length));
    return blocksByLength.get(length);
  };

  const candidatesFor = (session) => {
    const blocks = blocksFor(session.length);
    const ordered = [...workingDays].sort((a, b) => (localDayLoad.get(a) || 0) - (localDayLoad.get(b) || 0));
    const out = [];
    ordered.forEach((day) => blocks.forEach((block) => out.push({ day, block })));
    return out;
  };

  const faculty = (session) => facultyMap.get(String(session.facultyId._id || session.facultyId));

  const isValid = (session, day, block) => {
    const fac = faculty(session);
    if (!fac || !fac.availableDays.includes(day)) return false;

    for (const slot of block) {
      const cKey = key(day, String(slot._id));
      if (localClassBusy.has(cKey)) return false;
      if (ctx.facultyBusy.get(cKey)?.has(String(fac._id))) return false;
      if (unavailable.has(`${fac._id}|${day}|${slot._id}`)) return false;
    }

    const existingWeekly = ctx.facultyWeeklyCount.get(String(fac._id)) || 0;
    if (existingWeekly + block.length > fac.maxWeeklyHours) return false;

    const dayKey = `${fac._id}|${day}`;
    const dayOrders = new Set(ctx.facultyDayOrders.get(dayKey) || []);
    block.forEach((s) => dayOrders.add(s.order));
    if (longestConsecutiveRun(dayOrders) > fac.maxConsecutivePeriods) return false;

    return true;
  };

  const pickClassroom = (session, day, block) => {
    const wantedTypes = session.requiresLabRoom ? ['Computer Lab', 'Science Lab'] : ['Classroom', 'Seminar Hall'];
    const candidates = classrooms
      .filter((r) => wantedTypes.includes(r.type) && r.capacity >= (klass.strength || 0))
      .sort((a, b) => a.capacity - b.capacity);

    return candidates.find((room) =>
      block.every((slot) => !ctx.roomBusy.get(key(day, String(slot._id)))?.has(String(room._id)))
    );
  };

  const commit = (session, day, block, room) => {
    const fac = faculty(session);
    block.forEach((slot) => {
      const k = key(day, String(slot._id));
      localClassBusy.add(k);
      if (!ctx.facultyBusy.has(k)) ctx.facultyBusy.set(k, new Set());
      ctx.facultyBusy.get(k).add(String(fac._id));
      if (!ctx.roomBusy.has(k)) ctx.roomBusy.set(k, new Set());
      ctx.roomBusy.get(k).add(String(room._id));
    });
    ctx.facultyWeeklyCount.set(String(fac._id), (ctx.facultyWeeklyCount.get(String(fac._id)) || 0) + block.length);
    const dayKey = `${fac._id}|${day}`;
    if (!ctx.facultyDayOrders.has(dayKey)) ctx.facultyDayOrders.set(dayKey, new Set());
    block.forEach((s) => ctx.facultyDayOrders.get(dayKey).add(s.order));
    localDayLoad.set(day, (localDayLoad.get(day) || 0) + block.length);

    const entries = block.map((slot) => ({
      day,
      timeSlot: slot._id,
      subject: session.subjectId,
      faculty: fac._id,
      classroom: room._id,
    }));
    placements.push(entries);
    return entries;
  };

  const rollback = (session, day, block, room, entries) => {
    const fac = faculty(session);
    block.forEach((slot) => {
      const k = key(day, String(slot._id));
      ctx.facultyBusy.get(k)?.delete(String(fac._id));
      ctx.roomBusy.get(k)?.delete(String(room._id));
      localClassBusy.delete(k);
    });
    ctx.facultyWeeklyCount.set(String(fac._id), ctx.facultyWeeklyCount.get(String(fac._id)) - block.length);
    const dayKey = `${fac._id}|${day}`;
    block.forEach((s) => ctx.facultyDayOrders.get(dayKey)?.delete(s.order));
    localDayLoad.set(day, (localDayLoad.get(day) || 0) - block.length);
    placements.pop();
  };

  // True backtracking search, bounded by a step budget so a hard-to-satisfy
  // class can't run away; anything left over after the budget is exhausted
  // falls back to a best-effort greedy placement and is reported if it still fails.
  const backtrack = (index) => {
    if (index >= sessions.length) return true;
    if (steps > MAX_BACKTRACK_STEPS) return false;

    const session = sessions[index];
    const candidates = candidatesFor(session);

    for (const { day, block } of candidates) {
      steps += 1;
      if (steps > MAX_BACKTRACK_STEPS) break;
      if (!isValid(session, day, block)) continue;
      const room = pickClassroom(session, day, block);
      if (!room) continue;

      const entries = commit(session, day, block, room);
      if (backtrack(index + 1)) return true;
      rollback(session, day, block, room, entries);
    }
    return false;
  };

  const fullyPlaced = backtrack(0);

  if (!fullyPlaced) {
    // Greedy fallback for whatever the bounded backtracking above didn't resolve.
    sessions.slice(placements.length).forEach((session) => {
      const candidates = candidatesFor(session);
      const found = candidates.find(({ day, block }) => isValid(session, day, block) && pickClassroom(session, day, block));
      if (!found) {
        unresolved.push(`${session.subjectLabel}: no free faculty/classroom/day slot available`);
        return;
      }
      const room = pickClassroom(session, found.day, found.block);
      commit(session, found.day, found.block, room);
    });
  }

  return { entries: placements.flat(), unresolved };
}

module.exports = { loadSchedulingContext, generateForClass };
