import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';

const router = express.Router();

router.use(requireAuth);

// All authenticated users can view list and detail of departments
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);

// Only Admins (Super Admin) and HR can write/modify departments
router.post('/', requireRole(['Admin', 'HR']), createDepartment);
router.put('/:id', requireRole(['Admin', 'HR']), updateDepartment);
router.delete('/:id', requireRole(['Admin', 'HR']), deleteDepartment);

export default router;
