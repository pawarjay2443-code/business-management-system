import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember
} from '../controllers/teamController.js';

const router = express.Router();

router.use(requireAuth);

// Read-only team visibility
router.get('/', getTeams);
router.get('/:id', getTeamById);

// Team writes: Admins, HR and Managers
router.post('/', requireRole(['Admin', 'HR', 'Manager']), createTeam);
router.put('/:id', requireRole(['Admin', 'HR', 'Manager']), updateTeam);

// Member list adjustments: Admins, Managers and Team Leads
router.post('/:id/members', requireRole(['Admin', 'Manager', 'Team Lead']), addTeamMember);
router.delete('/:id/members/:userId', requireRole(['Admin', 'Manager', 'Team Lead']), removeTeamMember);

// Team deletion: Only Admins and HR
router.delete('/:id', requireRole(['Admin', 'HR']), deleteTeam);

export default router;
