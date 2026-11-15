const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/timetableController');

const router = express.Router();

router.use(protect);

router.get('/', ctrl.list);
router.get('/faculty/:facultyId', ctrl.getByFaculty);
router.get('/:id', ctrl.getOne);
router.get('/:id/export-pdf', ctrl.exportPdf);

router.post('/generate', authorize('superadmin', 'hod'), ctrl.generate);
router.post('/:id/regenerate', authorize('superadmin', 'hod'), ctrl.regenerate);

router.put('/entries/:entryId', authorize('superadmin', 'hod'), ctrl.updateEntry);
router.delete('/entries/:entryId', authorize('superadmin', 'hod'), ctrl.deleteEntry);

router.post('/:id/submit', authorize('superadmin', 'hod'), ctrl.submitForApproval);
router.post('/:id/approve', authorize('hod', 'superadmin'), ctrl.approve);
router.post('/:id/reject', authorize('hod', 'superadmin'), ctrl.reject);
router.post('/:id/publish', authorize('superadmin'), ctrl.publish);
router.post('/:id/unpublish', authorize('superadmin'), ctrl.unpublish);
router.post('/:id/archive', authorize('superadmin'), ctrl.archive);

module.exports = router;
