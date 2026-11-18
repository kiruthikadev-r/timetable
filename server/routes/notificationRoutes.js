const express = require('express');
const { protect } = require('../middleware/auth');
const { list, markRead, markAllRead, reportConflict } = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.post('/report-conflict', reportConflict);

module.exports = router;
