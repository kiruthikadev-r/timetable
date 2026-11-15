const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listByFaculty, setAvailability } = require('../controllers/availabilityController');

const router = express.Router();

router.use(protect);

router.get('/:facultyId', listByFaculty);
router.put('/', authorize('superadmin', 'hod'), setAvailability);

module.exports = router;
