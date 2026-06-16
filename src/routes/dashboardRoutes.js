import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(requireAuth);

// Accessible by all authenticated users (data isolation managed via dynamic RLS queries)
router.get('/stats', getDashboardStats);

export default router;
