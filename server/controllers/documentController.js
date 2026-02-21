const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');
const signPDF = require('../utils/pdfSigner');
const Signature = require('../models/Signature');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const AuditLog = require('../models/AuditLog');

// ---------------------------------------------------------
// HELPER: Create an Audit Log
// ---------------------------------------------------------
const logAudit = async (req, documentId, action, userEmail, details = '') => {
  try {
    // Express gets IP from req.ip (or x-forwarded-for if behind a proxy like Vercel)
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'];

    await AuditLog.create({
      document: documentId,
      action,
      userEmail,
      ipAddress,
      userAgent,
      details
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};

const maskEmail = (email) => {
  if (!email) return '';
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
};

// @desc    Upload a new document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      console.warn('⚠️ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('📁 Uploading file:', {
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });

    const doc = await Document.create({
      user: req.user._id, // Got from auth middleware
      title: req.body.title || req.file.originalname,
      originalName: req.file.originalname,
      filePath: req.file.path,
      status: 'Draft',
    });

    console.log('✅ Document created:', doc._id);

    // AUDIT LOG: Document Created
    await logAudit(req, doc._id, 'Created', req.user.email, 'Document uploaded');

    res.status(201).json(doc);
  } catch (error) {
    console.error('❌ Upload error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id
    });
    res.status(500).json({ 
      message: error.message || 'Failed to upload document',
      type: error.name
    });
  }
};

// @desc    Get all user documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (doc) {
      // Ensure user owns the document
      if (doc.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      res.json(doc);
    } else {
      res.status(404).json({ message: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Finalize and Sign Document
// @route   POST /api/documents/sign/:id
// @access  Private
const finalizeDocument = async (req, res) => {
  try {
    const { signatureImage } = req.body; // Get image from body
    const doc = await Document.findById(req.params.id);
    
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const signature = await Signature.findOne({ document: doc._id });
    if (!signature) {
      return res.status(400).json({ message: 'No signature position saved' });
    }

    // Pass signatureImage to the utility
    const signedFilePath = await signPDF(doc.filePath, signature, req.user, signatureImage);

    doc.status = 'Signed';
    doc.filePath = signedFilePath;
    await doc.save();

    // AUDIT LOG: Signed by Owner
    await logAudit(req, doc._id, 'Signed', req.user.email, 'Signed by Owner');

    res.json({ message: 'Document signed successfully', filePath: signedFilePath });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete a document
// @route   DELETE /api/documents/:id
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    
    // Ensure user owns it
    if (doc.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset a signed document back to draft
// @route   PUT /api/documents/:id/reset
// const resetDocument = async (req, res) => {
//   try {
//     const doc = await Document.findById(req.params.id);
//     if (!doc) return res.status(404).json({ message: 'Document not found' });

//     // Revert file path to the original (remove '-signed')
//     if (doc.status === 'Signed') {
//       doc.filePath = doc.filePath.replace('-signed.pdf', '.pdf');
//       doc.status = 'Draft';
//       await doc.save();
      
//       // AUDIT LOG: Document Reset
//       await logAudit(req, doc._id, 'Reset', req.user.email, 'Document reset to draft');
//     }
    
//     res.json({ message: 'Document reset to draft', doc });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// @desc    Share document via email
// @route   POST /api/documents/:id/share
// @access  Private
const shareDocument = async (req, res) => {
  try {
    const { email } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    const shareToken = crypto.randomBytes(20).toString('hex');

    doc.shareToken = shareToken;
    doc.recipientEmail = email;
    doc.accessCode = null; // Clear any old codes
    doc.status = 'Pending';
    await doc.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const signLink = `${clientUrl}/sign/${shareToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    try {
      await transporter.sendMail({
        from: `"Signverif" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Action Required: Please sign ${doc.title}`,
        html: `
          <h3>Signature Request</h3>
          <p>${req.user.name} has sent you a secure document to sign: <strong>${doc.title}</strong></p>
          <a href="${signLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 10px;">Review & Sign Document</a>
        `
      });
    } catch (emailErr) {
      console.error("Email failed:", emailErr);
    }

    await logAudit(req, doc._id, 'Shared', req.user.email, `Shared with ${email}`);
    res.json({ message: 'Document shared successfully', shareToken, signLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Check document status (Public)
// @route   GET /api/documents/shared/:token
// @access  Public
const getSharedDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token });
    if (!doc) return res.status(404).json({ message: 'Invalid or expired link' });

    res.json({
      title: doc.title,
      requiresOtp: true, // Always require OTP for shared links now
      maskedEmail: maskEmail(doc.recipientEmail) // Send a hidden version of their email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unlock document with PIN (Public)
// @route   POST /api/documents/shared/:token/unlock
// @access  Public
const unlockSharedDocument = async (req, res) => {
  try {
    const { accessCode } = req.body;
    const doc = await Document.findOne({ shareToken: req.params.token });
    
    if (!doc) return res.status(404).json({ message: 'Invalid link' });

    // Verify PIN if one exists
    if (doc.accessCode && doc.accessCode !== accessCode) {
      await logAudit(req, doc._id, 'Failed Verification', doc.recipientEmail, 'Incorrect PIN entered');
      return res.status(401).json({ message: 'Incorrect Access Code' });
    }

    // Success! Fetch the signature box and log the verification
    const signature = await Signature.findOne({ document: doc._id });
    await logAudit(req, doc._id, 'Verified', doc.recipientEmail, 'Passed PIN verification');
    await logAudit(req, doc._id, 'Viewed', doc.recipientEmail, 'Viewed document after unlocking');

    res.json({
      document: { title: doc.title, filePath: doc.filePath, status: doc.status },
      signaturePosition: signature ? { 
        x: signature.x, y: signature.y, 
        width: signature.width, height: signature.height 
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sign document via share token (Public)
// @route   POST /api/documents/shared/:token/sign
// @access  Public
const signSharedDocument = async (req, res) => {
  try {
    const { signatureImage } = req.body;
    const doc = await Document.findOne({ shareToken: req.params.token }).populate('user', 'name');
    
    if (!doc) return res.status(404).json({ message: 'Invalid link' });
    if (doc.status === 'Signed') return res.status(400).json({ message: 'Document already signed' });

    const signature = await Signature.findOne({ document: doc._id });
    if (!signature) return res.status(400).json({ message: 'No signature box found' });

    const signedFilePath = await signPDF(doc.filePath, signature, doc.user, signatureImage);

    doc.status = 'Signed';
    doc.filePath = signedFilePath;
    const signerEmail = doc.recipientEmail; // Save email before clearing token
    doc.shareToken = null; 
    await doc.save();

    // AUDIT LOG: Signed by Recipient
    await logAudit(req, doc._id, 'Signed', signerEmail, 'Signed via Public Link');

    res.json({ message: 'Document signed successfully', filePath: signedFilePath });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------
// NEW FUNCTION: Fetch Logs
// ---------------------------------------------------------
// @desc    Get audit logs for a document
// @route   GET /api/documents/:id/audit
// @access  Private
const getAuditLogs = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    // Fetch logs sorted by oldest first
    const logs = await AuditLog.find({ document: req.params.id }).sort({ createdAt: 1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Reject a shared document (Public)
// @route   POST /api/documents/shared/:token/reject
// @access  Public
const rejectSharedDocument = async (req, res) => {
  try {
    const { reason } = req.body;
    const doc = await Document.findOne({ shareToken: req.params.token });
    
    if (!doc) return res.status(404).json({ message: 'Invalid link' });
    if (doc.status === 'Signed') return res.status(400).json({ message: 'Document already signed' });
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

    doc.status = 'Rejected';
    doc.rejectionReason = reason;
    const signerEmail = doc.recipientEmail;
    doc.shareToken = null; // Kill the token so it can't be accessed again
    await doc.save();

    // AUDIT LOG: Document Rejected
    await logAudit(req, doc._id, 'Rejected', signerEmail, `Rejected. Reason: ${reason}`);

    res.json({ message: 'Document rejected successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset a signed or rejected document back to draft
// @route   PUT /api/documents/:id/reset
const resetDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.status === 'Signed') {
      doc.filePath = doc.filePath.replace('-signed.pdf', '.pdf');
      doc.status = 'Draft';
      await doc.save();
      await logAudit(req, doc._id, 'Reset', req.user.email, 'Document reset to draft');
    } else if (doc.status === 'Rejected') {
      doc.status = 'Draft';
      doc.rejectionReason = null; // Clear the old reason
      await doc.save();
      await logAudit(req, doc._id, 'Reset', req.user.email, 'Rejected document reset to draft');
    }
    
    res.json({ message: 'Document reset to draft', doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate and send OTP (Public)
// @route   POST /api/documents/shared/:token/request-otp
// @access  Public
const requestOTP = async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token });
    if (!doc) return res.status(404).json({ message: 'Invalid link' });

    // Generate 6-digit OTP and save it
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    doc.accessCode = accessCode;
    await doc.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    try {
      await transporter.sendMail({
        from: `"Signverif - Security" <${process.env.EMAIL_USER}>`,
        to: doc.recipientEmail,
        subject: `Your Access Code for ${doc.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Document Access Code</h3>
            <p>Please use the following 6-digit Access Code to unlock <strong>${doc.title}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <h2 style="letter-spacing: 8px; color: #2563eb; margin: 0; font-size: 32px;">${accessCode}</h2>
            </div>
          </div>
        `
      });
      console.log(`🔑 OTP generated and sent to ${doc.recipientEmail}: ${accessCode}`);
    } catch (err) {
      console.error("Failed to send OTP email", err);
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  uploadDocument, 
  getDocuments, 
  getDocumentById,
  finalizeDocument,
  deleteDocument,
  resetDocument,
  shareDocument,
  getSharedDocument,
  unlockSharedDocument,
  signSharedDocument,
  getAuditLogs,
  rejectSharedDocument,
  requestOTP

};