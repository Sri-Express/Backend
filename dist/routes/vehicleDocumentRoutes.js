"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/vehicleDocumentRoutes.ts - Vehicle Document Upload Routes
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const fleetMiddleware_1 = require("../middleware/fleetMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const s3Upload_1 = require("../services/s3Upload");
const vehicleDocumentController_1 = require("../controllers/vehicleDocumentController");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(authMiddleware_1.protect);
// Fleet manager routes
router.post('/:id/documents/upload', fleetMiddleware_1.requireFleetManager, s3Upload_1.multerConfig.array('documents', 5), // Allow up to 5 files
vehicleDocumentController_1.uploadVehicleDocuments);
router.get('/:id/documents', fleetMiddleware_1.requireFleetManager, vehicleDocumentController_1.getVehicleDocuments);
router.get('/:id/documents/:fileName/download', fleetMiddleware_1.requireFleetManager, vehicleDocumentController_1.getDocumentDownloadUrl);
router.delete('/:id/documents/:fileName', fleetMiddleware_1.requireFleetManager, vehicleDocumentController_1.deleteVehicleDocument);
// Admin routes (can access any vehicle documents)
router.get('/admin/:id/documents', adminMiddleware_1.requireAdmin, vehicleDocumentController_1.getVehicleDocuments);
router.get('/admin/:id/documents/:fileName/download', adminMiddleware_1.requireAdmin, vehicleDocumentController_1.getDocumentDownloadUrl);
exports.default = router;
