require('dotenv').config();
const connectDB = require('../config/database');

const User = require('../models/User');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Class = require('../models/Class');
const TimeSlot = require('../models/TimeSlot');
const Settings = require('../models/Settings');
const AcademicYear = require('../models/AcademicYear');
const FacultyAvailability = require('../models/FacultyAvailability');
const Timetable = require('../models/Timetable');
const TimetableEntry = require('../models/TimetableEntry');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const DEFAULT_PASSWORD = 'Passw0rd!123';

async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Faculty.deleteMany({}),
    Subject.deleteMany({}),
    Classroom.deleteMany({}),
    Class.deleteMany({}),
    TimeSlot.deleteMany({}),
    Settings.deleteMany({}),
    AcademicYear.deleteMany({}),
    FacultyAvailability.deleteMany({}),
    Timetable.deleteMany({}),
    TimetableEntry.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  await clearAll();

  await Settings.create({ key: 'global' });

  const slotDefs = [
    { order: 1, label: 'Period 1', startTime: '09:00', endTime: '10:00', type: 'period' },
    { order: 2, label: 'Period 2', startTime: '10:00', endTime: '11:00', type: 'period' },
    { order: 3, label: 'Period 3', startTime: '11:00', endTime: '12:00', type: 'period' },
    { order: 4, label: 'Lunch Break', startTime: '12:00', endTime: '13:00', type: 'lunch' },
    { order: 5, label: 'Period 4', startTime: '13:00', endTime: '14:00', type: 'period' },
    { order: 6, label: 'Period 5', startTime: '14:00', endTime: '15:00', type: 'period' },
    { order: 7, label: 'Period 6', startTime: '15:00', endTime: '16:00', type: 'period' },
  ];
  const slots = await TimeSlot.insertMany(slotDefs);
  const slotByLabel = new Map(slots.map((s) => [s.label, s]));

  const academicYear = await AcademicYear.create({
    name: '2026-2027',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2027-04-30'),
    isActive: true,
  });

  const departments = {
    CS: await Department.create({ name: 'Computer Science', code: 'CS', description: 'Department of Computer Science' }),
    BCA: await Department.create({ name: 'Computer Applications', code: 'BCA', description: 'Department of Computer Applications' }),
    COM: await Department.create({ name: 'Commerce', code: 'COM', description: 'Department of Commerce' }),
  };

  const classrooms = await Classroom.insertMany([
    { name: 'Room 101', roomNumber: '101', building: 'Main Block', floor: '1', capacity: 60, type: 'Classroom', equipment: ['Projector', 'Whiteboard'] },
    { name: 'Room 102', roomNumber: '102', building: 'Main Block', floor: '1', capacity: 60, type: 'Classroom', equipment: ['Projector', 'Whiteboard'] },
    { name: 'Room 201', roomNumber: '201', building: 'Main Block', floor: '2', capacity: 50, type: 'Classroom', equipment: ['Whiteboard'] },
    { name: 'Computer Lab A', roomNumber: 'LAB-A', building: 'Tech Block', floor: '1', capacity: 60, type: 'Computer Lab', equipment: ['Computers', 'Projector'] },
    { name: 'Computer Lab B', roomNumber: 'LAB-B', building: 'Tech Block', floor: '1', capacity: 60, type: 'Computer Lab', equipment: ['Computers'] },
    { name: 'Science Lab 1', roomNumber: 'SCI-1', building: 'Tech Block', floor: '2', capacity: 60, type: 'Science Lab', equipment: ['Lab Benches'] },
    { name: 'Seminar Hall', roomNumber: 'SH-1', building: 'Main Block', floor: '3', capacity: 120, type: 'Seminar Hall', equipment: ['Projector', 'Sound System'] },
  ]);

  const makeFaculty = async (deptKey, items) => {
    const out = [];
    for (const item of items) {
      const faculty = await Faculty.create({
        facultyId: item.id,
        name: item.name,
        email: item.email,
        phone: '9000000000',
        department: departments[deptKey]._id,
        designation: item.designation,
        specialization: item.specialization,
        maxWeeklyHours: item.maxWeeklyHours || 20,
        maxConsecutivePeriods: 3,
      });
      out.push(faculty);
    }
    return out;
  };

  const csFaculty = await makeFaculty('CS', [
    { id: 'CS-F01', name: 'Dr. Arvind Rao', email: 'arvind.rao@timetable.edu', designation: 'HOD & Professor', specialization: 'Algorithms', maxWeeklyHours: 16 },
    { id: 'CS-F02', name: 'Ms. Priya Nair', email: 'priya.nair@timetable.edu', designation: 'Assistant Professor', specialization: 'Programming' },
    { id: 'CS-F03', name: 'Mr. Suresh Kumar', email: 'suresh.kumar@timetable.edu', designation: 'Assistant Professor', specialization: 'Databases' },
    { id: 'CS-F04', name: 'Ms. Deepa Menon', email: 'deepa.menon@timetable.edu', designation: 'Assistant Professor', specialization: 'Mathematics' },
  ]);

  const bcaFaculty = await makeFaculty('BCA', [
    { id: 'BCA-F01', name: 'Dr. Kavitha Iyer', email: 'kavitha.iyer@timetable.edu', designation: 'HOD & Associate Professor', specialization: 'Software Engineering', maxWeeklyHours: 16 },
    { id: 'BCA-F02', name: 'Mr. Ramesh Babu', email: 'ramesh.babu@timetable.edu', designation: 'Assistant Professor', specialization: 'Electronics' },
    { id: 'BCA-F03', name: 'Ms. Anitha George', email: 'anitha.george@timetable.edu', designation: 'Assistant Professor', specialization: 'Communication' },
  ]);

  const comFaculty = await makeFaculty('COM', [
    { id: 'COM-F01', name: 'Dr. Lakshmi Pillai', email: 'lakshmi.pillai@timetable.edu', designation: 'HOD & Professor', specialization: 'Accounting', maxWeeklyHours: 16 },
    { id: 'COM-F02', name: 'Mr. Vijay Shankar', email: 'vijay.shankar@timetable.edu', designation: 'Assistant Professor', specialization: 'Business Law' },
    { id: 'COM-F03', name: 'Ms. Revathi Krishnan', email: 'revathi.krishnan@timetable.edu', designation: 'Assistant Professor', specialization: 'Statistics' },
  ]);

  const superadmin = await User.create({
    name: 'System Administrator',
    email: 'admin@timetable.edu',
    password: DEFAULT_PASSWORD,
    role: 'superadmin',
  });

  const hodCS = await User.create({ name: csFaculty[0].name, email: csFaculty[0].email, password: DEFAULT_PASSWORD, role: 'hod', department: departments.CS._id, faculty: csFaculty[0]._id });
  const hodBCA = await User.create({ name: bcaFaculty[0].name, email: bcaFaculty[0].email, password: DEFAULT_PASSWORD, role: 'hod', department: departments.BCA._id, faculty: bcaFaculty[0]._id });
  const hodCOM = await User.create({ name: comFaculty[0].name, email: comFaculty[0].email, password: DEFAULT_PASSWORD, role: 'hod', department: departments.COM._id, faculty: comFaculty[0]._id });

  departments.CS.hod = hodCS._id;
  departments.BCA.hod = hodBCA._id;
  departments.COM.hod = hodCOM._id;
  await Promise.all([departments.CS.save(), departments.BCA.save(), departments.COM.save()]);

  await User.create({ name: csFaculty[1].name, email: csFaculty[1].email, password: DEFAULT_PASSWORD, role: 'faculty', department: departments.CS._id, faculty: csFaculty[1]._id });
  await User.create({ name: bcaFaculty[1].name, email: bcaFaculty[1].email, password: DEFAULT_PASSWORD, role: 'faculty', department: departments.BCA._id, faculty: bcaFaculty[1]._id });
  await User.create({ name: comFaculty[1].name, email: comFaculty[1].email, password: DEFAULT_PASSWORD, role: 'faculty', department: departments.COM._id, faculty: comFaculty[1]._id });

  const makeSubjects = async (deptKey, semester, items) => {
    const out = [];
    for (const item of items) {
      const subject = await Subject.create({
        name: item.name,
        code: item.code,
        department: departments[deptKey]._id,
        semester,
        type: item.type || 'Theory',
        weeklyPeriods: item.weeklyPeriods,
        durationSlots: item.durationSlots || 1,
        requiresLab: item.type && item.type !== 'Theory',
      });
      out.push(subject);
    }
    return out;
  };

  const csSubjects = await makeSubjects('CS', 1, [
    { name: 'Programming in C', code: 'CS101', weeklyPeriods: 4 },
    { name: 'Digital Logic', code: 'CS102', weeklyPeriods: 3 },
    { name: 'Mathematics I', code: 'CS103', weeklyPeriods: 4 },
    { name: 'English', code: 'CS104', weeklyPeriods: 2 },
    { name: 'C Programming Lab', code: 'CS105', type: 'Lab', weeklyPeriods: 4, durationSlots: 2 },
  ]);

  const msccsSubjects = await makeSubjects('CS', 1, [
    { name: 'Advanced Algorithms', code: 'MCS101', weeklyPeriods: 4 },
    { name: 'Advanced DBMS', code: 'MCS102', weeklyPeriods: 3 },
    { name: 'Research Methodology', code: 'MCS103', weeklyPeriods: 2 },
    { name: 'Algorithms Lab', code: 'MCS104', type: 'Lab', weeklyPeriods: 4, durationSlots: 2 },
  ]);

  const bcaSubjects = await makeSubjects('BCA', 1, [
    { name: 'Programming Fundamentals', code: 'BCA101', weeklyPeriods: 4 },
    { name: 'Digital Electronics', code: 'BCA102', weeklyPeriods: 3 },
    { name: 'Business Communication', code: 'BCA103', weeklyPeriods: 2 },
    { name: 'Mathematics', code: 'BCA104', weeklyPeriods: 3 },
    { name: 'Programming Lab', code: 'BCA105', type: 'Lab', weeklyPeriods: 4, durationSlots: 2 },
  ]);

  const comSubjects = await makeSubjects('COM', 1, [
    { name: 'Financial Accounting', code: 'COM101', weeklyPeriods: 4 },
    { name: 'Business Law', code: 'COM102', weeklyPeriods: 3 },
    { name: 'Business Statistics', code: 'COM103', weeklyPeriods: 3 },
    { name: 'English', code: 'COM104', weeklyPeriods: 2 },
    { name: 'Computer Applications in Business', code: 'COM105', type: 'Practical', weeklyPeriods: 4, durationSlots: 2 },
  ]);

  const pair = (subjects, facultyCycle) => subjects.map((s, i) => ({ subject: s._id, faculty: facultyCycle[i % facultyCycle.length]._id }));
  const mapSubjects = (subjects, facultyBySubjectIndex) => subjects.map((s, i) => ({ subject: s._id, faculty: facultyBySubjectIndex[i]._id }));

  // csSubjects order: [Programming in C, Digital Logic, Mathematics I, English, C Programming Lab]
  // Faculty load is spread across Priya/Suresh/Deepa deliberately (rather than cycling
  // the same 2 faculty across every CS class) so no one faculty member's weekly-hours or
  // availability gets saturated once all CS classes are generated in the same run.
  await Class.create({
    department: departments.CS._id,
    academicYear: academicYear._id,
    semester: 1,
    programme: 'B.Sc Computer Science',
    section: 'A',
    strength: 45,
    classTeacher: csFaculty[1]._id,
    subjects: mapSubjects(csSubjects, [csFaculty[1], csFaculty[3], csFaculty[2], csFaculty[3], csFaculty[1]]),
  });

  await Class.create({
    department: departments.CS._id,
    academicYear: academicYear._id,
    semester: 3,
    programme: 'B.Sc Computer Science',
    section: 'A',
    strength: 40,
    classTeacher: csFaculty[2]._id,
    subjects: mapSubjects(csSubjects, [csFaculty[2], csFaculty[1], csFaculty[3], csFaculty[2], csFaculty[3]]),
  });

  await Class.create({
    department: departments.CS._id,
    academicYear: academicYear._id,
    semester: 1,
    programme: 'M.Sc Computer Science',
    section: 'A',
    strength: 25,
    classTeacher: csFaculty[0]._id,
    subjects: mapSubjects(msccsSubjects, [csFaculty[0], csFaculty[2], csFaculty[0], csFaculty[1]]),
  });

  await Class.create({
    department: departments.BCA._id,
    academicYear: academicYear._id,
    semester: 1,
    programme: 'BCA',
    section: 'A',
    strength: 50,
    classTeacher: bcaFaculty[1]._id,
    subjects: pair(bcaSubjects, [bcaFaculty[1], bcaFaculty[2], bcaFaculty[0], bcaFaculty[1], bcaFaculty[2]]),
  });

  await Class.create({
    department: departments.COM._id,
    academicYear: academicYear._id,
    semester: 1,
    programme: 'B.Com',
    section: 'A',
    strength: 55,
    classTeacher: comFaculty[1]._id,
    subjects: pair(comSubjects, [comFaculty[1], comFaculty[2], comFaculty[0], comFaculty[1], comFaculty[2]]),
  });

  console.log('Seed complete.');
  console.log('----------------------------------------');
  console.log('Superadmin : admin@timetable.edu /', DEFAULT_PASSWORD);
  console.log('HOD (CS)   :', hodCS.email, '/', DEFAULT_PASSWORD);
  console.log('HOD (BCA)  :', hodBCA.email, '/', DEFAULT_PASSWORD);
  console.log('HOD (COM)  :', hodCOM.email, '/', DEFAULT_PASSWORD);
  console.log('Faculty (CS):', csFaculty[1].email, '/', DEFAULT_PASSWORD);
  console.log('----------------------------------------');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
