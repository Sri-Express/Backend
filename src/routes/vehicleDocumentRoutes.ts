// src/routes/vehicleDocumentRoutes.ts - Vehicle Document Upload Routes
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireFleetManager } from '../middleware/fleetMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { multerConfig } from '../services/s3Upload';
import {
  uploadVehicleDocuments,
  getDocumentDownloadUrl,
  deleteVehicleDocument,
  getVehicleDocuments
} from '../controllers/vehicleDocumentController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Fleet manager routes
router.post(
  '/:id/documents/upload',
  requireFleetManager,
  multerConfig.array('documents', 5), // Allow up to 5 files
  uploadVehicleDocuments
);

router.get(
  '/:id/documents',
  requireFleetManager,
  getVehicleDocuments
);

router.get(
  '/:id/documents/:fileName/download',
  requireFleetManager,
  getDocumentDownloadUrl
);

router.delete(
  '/:id/documents/:fileName',
  requireFleetManager,
  deleteVehicleDocument
);

// Admin routes (can access any vehicle documents)
router.get(
  '/admin/:id/documents',
  requireAdmin,
  getVehicleDocuments
);

router.get(
  '/admin/:id/documents/:fileName/download',
  requireAdmin,
  getDocumentDownloadUrl
);

export default router;