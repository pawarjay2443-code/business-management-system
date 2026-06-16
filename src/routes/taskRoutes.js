import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
} from '../controllers/taskController.js';

const router = express.Router();

router.use(requireAuth);

// All authenticated users can read tasks
router.get('/', getTasks);
router.get('/:id', getTaskById);

// Task creation and deletion: restricted to managers, admins, and team leads
router.post('/', requireRole(['Admin', 'Manager', 'Team Lead']), createTask);
router.delete('/:id', requireRole(['Admin', 'Manager', 'Team Lead']), deleteTask);

// Assign a task: restricted to managers, admins, and team leads
router.post('/:id/assign', requireRole(['Admin', 'Manager', 'Team Lead']), assignTask);

// Update status: Allowed for assignee or managers
router.put('/:id/status', updateTaskStatus);

// General update: checked internally for manager or assignee status
router.put('/:id', updateTask);

export default router;
