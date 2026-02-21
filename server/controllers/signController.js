const Signature = require('../models/Signature');
const Document = require('../models/Document');

// @desc    Save signature position
// @route   POST /api/signatures
// @access  Private
const saveSignature = async (req, res) => {
  const { documentId, x, y, width, height, signatureImage, viewportWidth, viewportHeight } = req.body;

  try {
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const signature = await Signature.findOneAndUpdate(
      { document: documentId, user: req.user._id },
      { 
        x, y, width, height, signatureImage,
        viewportWidth: viewportWidth || 600, // Save viewport width
        viewportHeight: viewportHeight || 800,
        status: 'Pending' 
      },
      { new: true, upsert: true }
    );

    res.status(201).json(signature);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get signature for a document
// @route   GET /api/signatures/:documentId
const getSignature = async (req, res) => {
  try {
    const signature = await Signature.findOne({ document: req.params.documentId });
    if (signature) {
      res.json(signature);
    } else {
      res.json(null); // No signature yet
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveSignature, getSignature };