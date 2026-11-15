const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  list,
  create,
  update,
  remove,
  getSettings,
  updateSettings,
} = require('../controllers/timeSlotController');

const router = express.Router();

router.use(protect);

router.get('/settings', getSettings);
router.put('/settings', authorize('superadmin'), updateSettings);

router.get('/', list);
router.post('/', authorize('superadmin'), create);
router.put('/:id', authorize('superadmin'), update);
router.delete('/:id', authorize('superadmin'), remove);

module.exports = router;
