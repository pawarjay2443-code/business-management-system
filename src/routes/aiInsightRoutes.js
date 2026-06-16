import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { storeAIInsight, getAIInsights, deleteAIInsight } from '../controllers/aiInsightController.js';

const router = express.Router();

router.use(requireAuth);

// Anyone authorized by RLS can read insights
router.get('/', getAIInsights);

// Storage/Deletions restricted to Admin, HR, or Managers
router.post('/', requireRole(['Admin', 'HR', 'Manager']), storeAIInsight);
router.delete('/:id', requireRole(['Admin', 'HR', 'Manager']), deleteAIInsight);

export default router;
