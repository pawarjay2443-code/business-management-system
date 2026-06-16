import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { getActivityLogs } from '../controllers/activityController.js';

const router = express.Router();

router.use(requireAuth);

// Only Admins (Super Admin) and HR can view global activity logs
router.get('/', requireRole(['Admin', 'HR']), getActivityLogs);

export default router;
