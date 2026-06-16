import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  manageMilestones
} from '../controllers/projectController.js';

const router = express.Router();

router.use(requireAuth);

// Read-only projects access
router.get('/', getProjects);
router.get('/:id', getProjectById);

// Modify projects: Admins, Managers and Team Leads
router.post('/', requireRole(['Admin', 'Manager', 'Team Lead']), createProject);
router.put('/:id', requireRole(['Admin', 'Manager', 'Team Lead']), updateProject);
router.put('/:id/milestones', requireRole(['Admin', 'Manager', 'Team Lead']), manageMilestones);

// Delete projects: Admins and Managers
router.delete('/:id', requireRole(['Admin', 'Manager']), deleteProject);

export default router;
