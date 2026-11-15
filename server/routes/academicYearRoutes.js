const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { list, create, update, remove } = require('../controllers/academicYearController');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.post('/', authorize('superadmin'), create);
router.put('/:id', authorize('superadmin'), update);
router.delete('/:id', authorize('superadmin'), remove);

module.exports = router;
