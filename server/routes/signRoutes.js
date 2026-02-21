const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveSignature, getSignature } = require('../controllers/signController');


router.post('/', protect, saveSignature);
router.get('/:documentId', protect, getSignature);

module.exports = router;