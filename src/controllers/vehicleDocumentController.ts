// src/controllers/vehicleDocumentController.ts - Vehicle Document Upload Management
import { Request, Response } from 'express';
import Device from '../models/Device';
import Fleet from '../models/Fleet';
import { uploadFileToS3, generateSignedUrl, deleteFileFromS3 } from '../services/s3Upload';
import mongoose from 'mongoose';

interface FileUploadRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// @desc    Upload documents for a vehicle
// @route   POST /api/fleet/vehicles/:id/documents/upload
// @access  Private (Fleet Manager)
export const uploadVehicleDocuments = async (req: FileUploadRequest, res: Response): Promise<void> => {
  console.log('=== UPLOAD ENDPOINT HIT ===');
  console.log('Vehicle ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('Files:', req.files);
  console.log('User:', req.user?.email);
  
  try {
    const { id } = req.params;
    const { documentType, expiryDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }

    // Find vehicle that belongs to this fleet
    const vehicle = await Device.findOne({
      _id: id,
      fleetId: fleet._id,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
      return;
    }

    // Check if files were uploaded
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const uploadResults = [];
    const documentUpdates: any = {};

    // Initialize documents if not exists
    if (!vehicle.documents) {
      vehicle.documents = {};
    }

    // Process each uploaded file
    for (const file of files) {
      try {
        // Upload to S3
        const uploadResult = await uploadFileToS3(file, 'vehicle-documents', vehicle._id as string);
        
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
            (docUpdate as any).expiryDate = new Date(expiryDate);
          }

          documentUpdates[`documents.${documentType}`] = docUpdate;
        } else {
          // Add to additional files
          if (!vehicle.documents.additionalFiles) {
            vehicle.documents.additionalFiles = [];
          }
          
          vehicle.documents.additionalFiles.push({
            name: documentType || file.originalname,
            fileName: uploadResult.fileName!,
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

      } catch (error) {
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
      await Device.findByIdAndUpdate(id, documentUpdates);
    } else if (vehicle.documents.additionalFiles && vehicle.documents.additionalFiles.length > 0) {
      await vehicle.save();
    }

    // Get updated vehicle data
    const updatedVehicle = await Device.findById(id);

    res.status(200).json({
      message: 'Document upload completed',
      results: uploadResults,
      vehicle: updatedVehicle
    });

  } catch (error) {
    console.error('Upload vehicle documents error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get document download URL
// @route   GET /api/fleet/vehicles/:id/documents/:fileName/download
// @access  Private (Fleet Manager or Admin)
export const getDocumentDownloadUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, fileName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find vehicle (accessible to fleet owners or admins)
    let vehicle;
    if (req.user?.role === 'system_admin') {
      // Admin can access any vehicle
      vehicle = await Device.findById(id);
    } else {
      // Fleet manager can only access their own vehicles
      const fleet = await Fleet.findOne({ 
        email: req.user?.email,
        isActive: true 
      });
      
      if (!fleet) {
        res.status(400).json({ message: 'Fleet not found for this user' });
        return;
      }

      vehicle = await Device.findOne({
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
        const doc = (vehicle.documents as any)[docType];
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
    const signedUrl = await generateSignedUrl(decodedFileName, 3600);

    res.json({
      downloadUrl: signedUrl,
      expiresIn: 3600 // 1 hour in seconds
    });

  } catch (error) {
    console.error('Get document download URL error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete a vehicle document
// @route   DELETE /api/fleet/vehicles/:id/documents/:fileName
// @access  Private (Fleet Manager)
export const deleteVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, fileName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }

    // Find vehicle that belongs to this fleet
    const vehicle = await Device.findOne({
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
    const updateOperations: any = {};

    if (vehicle.documents) {
      // Check and remove from specific document types
      const docTypes = ['vehicleRegistration', 'insurance', 'safetyInspection', 'revenueLicense'];
      for (const docType of docTypes) {
        const doc = (vehicle.documents as any)[docType];
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
        const fileIndex = vehicle.documents.additionalFiles.findIndex(
          file => file.fileName === decodedFileName
        );
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
    const deleted = await deleteFileFromS3(decodedFileName);
    if (!deleted) {
      res.status(500).json({ message: 'Failed to delete file from storage' });
      return;
    }

    // Update vehicle document records
    await Device.findByIdAndUpdate(id, updateOperations);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete vehicle document error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get vehicle documents list
// @route   GET /api/fleet/vehicles/:id/documents
// @access  Private (Fleet Manager or Admin)
export const getVehicleDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find vehicle (accessible to fleet owners or admins)
    let vehicle;
    if (req.user?.role === 'system_admin') {
      // Admin can access any vehicle
      vehicle = await Device.findById(id);
    } else {
      // Fleet manager can only access their own vehicles
      const fleet = await Fleet.findOne({ 
        email: req.user?.email,
        isActive: true 
      });
      
      if (!fleet) {
        res.status(400).json({ message: 'Fleet not found for this user' });
        return;
      }

      vehicle = await Device.findOne({
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

  } catch (error) {
    console.error('Get vehicle documents error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};