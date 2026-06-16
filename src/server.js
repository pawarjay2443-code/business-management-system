import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import Utilities & Middlewares
import { globalErrorHandler } from './utils/errorHandler.js';
import { getSupabaseClient } from './config/supabase.js';

// Import Route modules
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import aiInsightRoutes from './routes/aiInsightRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});

// =========================================================================
// GLOBAL MIDDLEWARES
// =========================================================================

// Secure HTTP Headers
// app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming request JSON bodies
app.use(express.json({ limit: '10kb' }));

// Inject user-scoped or anonymous Supabase client globally
app.use((req, res, next) => {
  req.db = getSupabaseClient(req.headers.authorization);
  next();
});

// Serve frontend UI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../code.html'));
});

// Development Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Simple API Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AI Business Management Platform API is running.',
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// ROUTE REGISTRATION
// =========================================================================
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/ai-insights', aiInsightRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback for non-existent route paths
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find route path '${req.originalUrl}' on this server.`
  });
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

// Start listening for traffic
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});

export default app;
