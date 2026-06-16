import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createPerformanceMetric,
  getPerformanceMetrics,
  getPerformanceMetricById,
  updatePerformanceMetric,
  deletePerformanceMetric,
  calculateKPIScores,
  getProductivityAnalytics
} from '../controllers/performanceController.js';

const router = express.Router();

router.use(requireAuth);

// KPI Calculator & Overall productivity metrics accessible to Managers, Leads, HR & Admin
router.get('/calculate-kpi', requireRole(['Admin', 'HR', 'Manager', 'Team Lead']), calculateKPIScores);
router.get('/productivity-analytics', requireRole(['Admin', 'HR', 'Manager', 'Team Lead']), getProductivityAnalytics);

// CRUD routes
router.get('/', getPerformanceMetrics); // Filtering/visibility enforced internally by RLS
router.get('/:id', getPerformanceMetricById);

// Creation, updates, and deletes allowed for Admins, HR & Managers only
router.post('/', requireRole(['Admin', 'HR', 'Manager']), createPerformanceMetric);
router.put('/:id', requireRole(['Admin', 'HR', 'Manager']), updatePerformanceMetric);
router.delete('/:id', requireRole(['Admin', 'HR', 'Manager']), deletePerformanceMetric);

export default router;
