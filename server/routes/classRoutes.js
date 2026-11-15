const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { list, create, getOne, update, remove } = require('../controllers/classController');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.get('/:id', getOne);
router.post('/', authorize('superadmin', 'hod'), create);
router.put('/:id', authorize('superadmin', 'hod'), update);
router.delete('/:id', authorize('superadmin'), remove);

module.exports = router;
