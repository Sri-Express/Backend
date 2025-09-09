// src/services/s3Upload.ts - AWS S3 File Upload Service
import AWS from 'aws-sdk';
import multer from 'multer';
import { Request } from 'express';

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'sri-express';

// Allowed file types for document upload
const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// File size limit (5MB)
const maxFileSize = 5 * 1024 * 1024;

interface FileUploadResult {
  success: boolean;
  fileName?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  url?: string;
  error?: string;
}

// Upload file to S3
export const uploadFileToS3 = async (
  file: Express.Multer.File, 
  folder: string = 'vehicle-documents',
  vehicleId?: string
): Promise<FileUploadResult> => {
  try {
    console.log('=== S3 Upload Debug ===');
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: !!file.buffer,
      bufferLength: file.buffer?.length
    });
    console.log('S3 Config:', {
      bucketName,
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing'
    });

    // Validate file type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.log('File type validation failed:', file.mimetype);
      return {
        success: false,
        error: 'File type not allowed. Please upload PDF, Word documents, or images only.'
      };
    }

    // Validate file size
    if (file.size > maxFileSize) {
      console.log('File size validation failed:', file.size);
      return {
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    const fileName = vehicleId 
      ? `${folder}/${vehicleId}/${timestamp}-${file.originalname}`
      : `${folder}/${timestamp}-${file.originalname}`;

    console.log('Generated filename:', fileName);

    // Upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private', // Private access - use signed URLs to access
      Metadata: {
        'original-name': file.originalname,
        'uploaded-by': 'sri-express-system',
        'vehicle-id': vehicleId ? String(vehicleId) : 'unknown'
      }
    };

    console.log('Upload params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      BodyLength: uploadParams.Body?.length
    });

    // Upload to S3
    console.log('Starting S3 upload...');
    const result = await s3.upload(uploadParams).promise();
    console.log('S3 upload result:', result);

    return {
      success: true,
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: result.Location
    };

  } catch (error) {
    console.error('=== S3 Upload Error ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

// Generate signed URL for accessing private files
export const generateSignedUrl = async (fileName: string, expiresIn: number = 3600): Promise<string> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Expires: expiresIn // URL expires in seconds (default: 1 hour)
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('Signed URL Generation Error:', error);
    throw new Error('Failed to generate file access URL');
  }
};

// Delete file from S3
export const deleteFileFromS3 = async (fileName: string): Promise<boolean> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileName
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};

// Multer configuration for memory storage (we'll upload to S3 directly)
export const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, Word documents, or images only.'));
    }
  }
});

// Utility function to get file info from S3
export const getFileInfo = async (fileName: string) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileName
    };

    const result = await s3.headObject(params).promise();
    
    return {
      exists: true,
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      metadata: result.Metadata
    };
  } catch (error) {
    return { exists: false };
  }
};

export default {
  uploadFileToS3,
  generateSignedUrl,
  deleteFileFromS3,
  getFileInfo,
  multerConfig
};