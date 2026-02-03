import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import varProcessorRoutes from './routes/var-processor.js';
import steamApiRoutes from './routes/steam-api.js';
import templateRoutes from './routes/templates.js';
import testPdfRoutes from './routes/test-pdf.js';
import userRoutes from './routes/users.js';

// Import database initialization
import { initDatabase } from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8092;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for production

// Middleware
// CORS configuration - allow multiple origins in production
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : (process.env.NODE_ENV === 'production' ? null : ['http://localhost:5173']);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If no CLIENT_URL is set in production, allow all origins (same-origin requests)
    // This is safe because the app serves its own frontend
    if (allowedOrigins === null) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for HTTP (set to true only if using HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/var', varProcessorRoutes);
app.use('/api/steam', steamApiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/test', testPdfRoutes); // Test endpoint for PDF extraction
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve test page
app.use('/test', express.static(path.join(__dirname, 'public')));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use(async (err, req, res, next) => {
  try {
    const { Logger } = await import('./utils/logger.js');
    Logger.error('Unhandled error', err);
  } catch (logError) {
    console.error('Error logging failed:', logError);
    console.error('Original error:', err);
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Access the application at: http://${HOST}:${PORT}`);
      }
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

startServer();

