const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { list, create, getOne, update, remove } = require('../controllers/userController');

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
