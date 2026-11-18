const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.use(protect, authorize('superadmin', 'hod'));

router.get('/faculty-workload', ctrl.facultyWorkload);
router.get('/classroom-utilization', ctrl.classroomUtilization);
router.get('/subject-allocation', ctrl.subjectAllocation);
router.get('/unassigned-subjects', ctrl.unassignedSubjects);
router.get('/timetable-completion', ctrl.timetableCompletion);
router.get('/class-schedule/:classId', ctrl.classSchedule);
router.get('/faculty-free-periods', ctrl.facultyFreePeriods);
router.get('/conflicts', ctrl.schedulingConflicts);
router.get('/export', ctrl.exportReport);

module.exports = router;
