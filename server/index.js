const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const signatureRoutes = require('./routes/signRoutes');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware - CORS Configuration
// Allow requests from your frontend URL (or all in development)
const corsOptions = {
    origin: process.env.CLIENT_URL || '*',  // Use CLIENT_URL from .env, fallback to all origins for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));

// 2. Fix 413 Payload Too Large (Increase limit to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route for Testing
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Mount Routes
app.use('/api/auth', authRoutes);

app.use('/api/documents', documentRoutes);

// Make the 'uploads' folder static so frontend can access files
app.use('/uploads', express.static('uploads'));

app.use('/api/signatures', signatureRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});