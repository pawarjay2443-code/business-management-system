import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  signup,
  login,
  logout,
  resetPasswordRequest,
  updatePassword,
  getProfile,
  updateProfile,
  getProfiles
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/reset-password', resetPasswordRequest);

// Protected routes (require authorization)
router.use(requireAuth);
router.post('/logout', logout);
router.post('/update-password', updatePassword);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/profiles', getProfiles);

export default router;
