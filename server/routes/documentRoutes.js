const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware'); // We need to create this!
const { uploadDocument, getDocuments, getDocumentById, finalizeDocument, deleteDocument, resetDocument, shareDocument, getSharedDocument, signSharedDocument, getAuditLogs, unlockSharedDocument, rejectSharedDocument, requestOTP } = require('../controllers/documentController');

// Configure Multer Storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Save to 'uploads' folder
  },
  filename(req, file, cb) {
    // Rename file to prevent duplicates: uniqueSuffix + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File Filter (PDF Only)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Not a PDF! Please upload only PDF.'), false);
    }
}

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter 
});


// Routes
router.route('/upload').post(protect, upload.single('file'), uploadDocument);
router.route('/').get(protect, getDocuments);
router.route('/:id').get(protect, getDocumentById);
router.route('/sign/:id').post(protect, finalizeDocument);
router.route('/:id').get(protect, getDocumentById).delete(protect, deleteDocument); // Added .delete()
router.route('/:id/reset').put(protect, resetDocument); // Added Reset route
router.route('/:id/share').post(protect, shareDocument);
router.route('/shared/:token').get(getSharedDocument);
router.route('/shared/:token/sign').post(signSharedDocument);
router.route('/:id/audit').get(protect, getAuditLogs);
// Add unlockSharedDocument to your imports, then add the route:
router.route('/shared/:token/unlock').post(unlockSharedDocument);
router.route('/shared/:token/reject').post(rejectSharedDocument);
router.route('/shared/:token/request-otp').post(requestOTP);

module.exports = router;