import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  exportReport
} from '../controllers/reportController.js';

const router = express.Router();

router.use(requireAuth);

// Authenticated users can list/read reports (filtered by RLS)
router.get('/', getReports);
router.get('/:id', getReportById);
router.get('/:id/export', exportReport);

// Only Admins, Managers and HR can modify or create reports
router.post('/', requireRole(['Admin', 'HR', 'Manager']), createReport);
router.put('/:id', requireRole(['Admin', 'HR', 'Manager']), updateReport);
router.delete('/:id', requireRole(['Admin', 'HR', 'Manager']), deleteReport);

export default router;
