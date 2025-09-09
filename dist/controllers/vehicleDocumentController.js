"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVehicleDocuments = exports.deleteVehicleDocument = exports.getDocumentDownloadUrl = exports.uploadVehicleDocuments = void 0;
const Device_1 = __importDefault(require("../models/Device"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
const s3Upload_1 = require("../services/s3Upload");
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Upload documents for a vehicle
// @route   POST /api/fleet/vehicles/:id/documents/upload
// @access  Private (Fleet Manager)
const uploadVehicleDocuments = async (req, res) => {
    var _a, _b;
    console.log('=== UPLOAD ENDPOINT HIT ===');
    console.log('Vehicle ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Files:', req.files);
    console.log('User:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.email);
    try {
        const { id } = req.params;
        const { documentType, expiryDate } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        // Find vehicle that belongs to this fleet
        const vehicle = await Device_1.default.findOne({
            _id: id,
            fleetId: fleet._id,
            isActive: true
        });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
            return;
        }
        // Check if files were uploaded
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const uploadResults = [];
        const documentUpdates = {};
        // Initialize documents if not exists
        if (!vehicle.documents) {
            vehicle.documents = {};
        }
        // Process each uploaded file
        for (const file of files) {
            try {
                // Upload to S3
                const uploadResult = await (0, s3Upload_1.uploadFileToS3)(file, 'vehicle-documents', vehicle._id);
                if (!uploadResult.success) {
                    uploadResults.push({
                        originalName: file.originalname,
                        success: false,
                        error: uploadResult.error
                    });
                    continue;
                }
                // Update vehicle document records based on document type
                if (documentType && ['vehicleRegistration', 'insurance', 'safetyInspection', 'revenueLicense'].includes(documentType)) {
                    const docUpdate = {
                        uploaded: true,
                        fileName: uploadResult.fileName,
                        uploadDate: new Date(),
                    };
                    // Add expiry date if provided for certain document types
                    if (['insurance', 'safetyInspection', 'revenueLicense'].includes(documentType) && expiryDate) {
                        docUpdate.expiryDate = new Date(expiryDate);
                    }
                    documentUpdates[`documents.${documentType}`] = docUpdate;
                }
                else {
                    // Add to additional files
                    if (!vehicle.documents.additionalFiles) {
                        vehicle.documents.additionalFiles = [];
                    }
                    vehicle.documents.additionalFiles.push({
                        name: documentType || file.originalname,
                        fileName: uploadResult.fileName,
                        uploadDate: new Date()
                    });
                }
                uploadResults.push({
                    originalName: file.originalname,
                    success: true,
                    fileName: uploadResult.fileName,
                    size: uploadResult.size,
                    documentType: documentType || 'additional'
                });
            }
            catch (error) {
                console.error(`Error uploading file ${file.originalname}:`, error);
                uploadResults.push({
                    originalName: file.originalname,
                    success: false,
                    error: error instanceof Error ? error.message : 'Upload failed'
                });
            }
        }
        // Update vehicle document records
        if (Object.keys(documentUpdates).length > 0) {
            await Device_1.default.findByIdAndUpdate(id, documentUpdates);
        }
        else if (vehicle.documents.additionalFiles && vehicle.documents.additionalFiles.length > 0) {
            await vehicle.save();
        }
        // Get updated vehicle data
        const updatedVehicle = await Device_1.default.findById(id);
        res.status(200).json({
            message: 'Document upload completed',
            results: uploadResults,
            vehicle: updatedVehicle
        });
    }
    catch (error) {
        console.error('Upload vehicle documents error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadVehicleDocuments = uploadVehicleDocuments;
// @desc    Get document download URL
// @route   GET /api/fleet/vehicles/:id/documents/:fileName/download
// @access  Private (Fleet Manager or Admin)
const getDocumentDownloadUrl = async (req, res) => {
    var _a, _b;
    try {
        const { id, fileName } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        // Find vehicle (accessible to fleet owners or admins)
        let vehicle;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'system_admin') {
            // Admin can access any vehicle
            vehicle = await Device_1.default.findById(id);
        }
        else {
            // Fleet manager can only access their own vehicles
            const fleet = await Fleet_1.default.findOne({
                email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
                isActive: true
            });
            if (!fleet) {
                res.status(400).json({ message: 'Fleet not found for this user' });
                return;
            }
            vehicle = await Device_1.default.findOne({
                _id: id,
                fleetId: fleet._id,
                isActive: true
            });
        }
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Verify the file belongs to this vehicle
        const decodedFileName = decodeURIComponent(fileName);
        let fileExists = false;
        if (vehicle.documents) {
            // Check in specific document types
            const docTypes = ['vehicleRegistration', 'insurance', 'safetyInspection', 'revenueLicense'];
            for (const docType of docTypes) {
                const doc = vehicle.documents[docType];
                if (doc && doc.fileName === decodedFileName) {
                    fileExists = true;
                    break;
                }
            }
            // Check in additional files
            if (!fileExists && vehicle.documents.additionalFiles) {
                fileExists = vehicle.documents.additionalFiles.some(file => file.fileName === decodedFileName);
            }
        }
        if (!fileExists) {
            res.status(404).json({ message: 'Document not found for this vehicle' });
            return;
        }
        // Generate signed URL (valid for 1 hour)
        const signedUrl = await (0, s3Upload_1.generateSignedUrl)(decodedFileName, 3600);
        res.json({
            downloadUrl: signedUrl,
            expiresIn: 3600 // 1 hour in seconds
        });
    }
    catch (error) {
        console.error('Get document download URL error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getDocumentDownloadUrl = getDocumentDownloadUrl;
// @desc    Delete a vehicle document
// @route   DELETE /api/fleet/vehicles/:id/documents/:fileName
// @access  Private (Fleet Manager)
const deleteVehicleDocument = async (req, res) => {
    var _a;
    try {
        const { id, fileName } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        // Find vehicle that belongs to this fleet
        const vehicle = await Device_1.default.findOne({
            _id: id,
            fleetId: fleet._id,
            isActive: true
        });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
            return;
        }
        const decodedFileName = decodeURIComponent(fileName);
        let documentFound = false;
        const updateOperations = {};
        if (vehicle.documents) {
            // Check and remove from specific document types
            const docTypes = ['vehicleRegistration', 'insurance', 'safetyInspection', 'revenueLicense'];
            for (const docType of docTypes) {
                const doc = vehicle.documents[docType];
                if (doc && doc.fileName === decodedFileName) {
                    updateOperations[`documents.${docType}`] = {
                        uploaded: false,
                        fileName: undefined,
                        uploadDate: undefined,
                        expiryDate: undefined
                    };
                    documentFound = true;
                    break;
                }
            }
            // Check and remove from additional files
            if (!documentFound && vehicle.documents.additionalFiles) {
                const fileIndex = vehicle.documents.additionalFiles.findIndex(file => file.fileName === decodedFileName);
                if (fileIndex !== -1) {
                    updateOperations['$pull'] = {
                        'documents.additionalFiles': { fileName: decodedFileName }
                    };
                    documentFound = true;
                }
            }
        }
        if (!documentFound) {
            res.status(404).json({ message: 'Document not found for this vehicle' });
            return;
        }
        // Delete from S3
        const deleted = await (0, s3Upload_1.deleteFileFromS3)(decodedFileName);
        if (!deleted) {
            res.status(500).json({ message: 'Failed to delete file from storage' });
            return;
        }
        // Update vehicle document records
        await Device_1.default.findByIdAndUpdate(id, updateOperations);
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Delete vehicle document error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteVehicleDocument = deleteVehicleDocument;
// @desc    Get vehicle documents list
// @route   GET /api/fleet/vehicles/:id/documents
// @access  Private (Fleet Manager or Admin)
const getVehicleDocuments = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        // Find vehicle (accessible to fleet owners or admins)
        let vehicle;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'system_admin') {
            // Admin can access any vehicle
            vehicle = await Device_1.default.findById(id);
        }
        else {
            // Fleet manager can only access their own vehicles
            const fleet = await Fleet_1.default.findOne({
                email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
                isActive: true
            });
            if (!fleet) {
                res.status(400).json({ message: 'Fleet not found for this user' });
                return;
            }
            vehicle = await Device_1.default.findOne({
                _id: id,
                fleetId: fleet._id,
                isActive: true
            });
        }
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json({
            vehicleId: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            documents: vehicle.documents || {}
        });
    }
    catch (error) {
        console.error('Get vehicle documents error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getVehicleDocuments = getVehicleDocuments;
