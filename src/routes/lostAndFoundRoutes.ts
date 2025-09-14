// src/routes/lostAndFoundRoutes.ts
import express from 'express';
import {
  getAllItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  claimItem,
  getPotentialMatches,
  markAsMatch,
  getUserItems,
  getStats,
  extendExpiry,
  getCategories
} from '../controllers/lostAndFoundController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getAllItems);
router.get('/categories', getCategories);
router.get('/stats', getStats);
router.get('/:id', getItem);
router.get('/:id/matches', getPotentialMatches);

// Protected routes (require authentication)
router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);
router.post('/:id/claim', protect, claimItem);
router.post('/:id/matches', protect, markAsMatch);
router.post('/:id/extend', protect, extendExpiry);
router.get('/user/my-items', protect, getUserItems);

export default router;