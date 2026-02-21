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
    origin: function(origin, callback) {
        // List of allowed origins
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
        ].filter(Boolean); // Remove undefined values
        
        // Development: allow all
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // Production: check whitelist
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
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

// Global Error Handler - Must be last
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', {
    message: err.message,
    path: req.path,
    method: req.method,
    status: err.status || 500,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Send error response
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    path: req.path,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Client URL: ${process.env.CLIENT_URL || 'Not set'}`);
});