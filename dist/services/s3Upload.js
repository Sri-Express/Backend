"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileInfo = exports.multerConfig = exports.deleteFileFromS3 = exports.generateSignedUrl = exports.uploadFileToS3 = void 0;
// src/services/s3Upload.ts - AWS S3 File Upload Service
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const multer_1 = __importDefault(require("multer"));
// Configure AWS S3
aws_sdk_1.default.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});
const s3 = new aws_sdk_1.default.S3();
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
// Upload file to S3
const uploadFileToS3 = async (file, folder = 'vehicle-documents', vehicleId) => {
    var _a, _b;
    try {
        console.log('=== S3 Upload Debug ===');
        console.log('File details:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: !!file.buffer,
            bufferLength: (_a = file.buffer) === null || _a === void 0 ? void 0 : _a.length
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
            BodyLength: (_b = uploadParams.Body) === null || _b === void 0 ? void 0 : _b.length
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
    }
    catch (error) {
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
exports.uploadFileToS3 = uploadFileToS3;
// Generate signed URL for accessing private files
const generateSignedUrl = async (fileName, expiresIn = 3600) => {
    try {
        const params = {
            Bucket: bucketName,
            Key: fileName,
            Expires: expiresIn // URL expires in seconds (default: 1 hour)
        };
        return s3.getSignedUrl('getObject', params);
    }
    catch (error) {
        console.error('Signed URL Generation Error:', error);
        throw new Error('Failed to generate file access URL');
    }
};
exports.generateSignedUrl = generateSignedUrl;
// Delete file from S3
const deleteFileFromS3 = async (fileName) => {
    try {
        const params = {
            Bucket: bucketName,
            Key: fileName
        };
        await s3.deleteObject(params).promise();
        return true;
    }
    catch (error) {
        console.error('S3 Delete Error:', error);
        return false;
    }
};
exports.deleteFileFromS3 = deleteFileFromS3;
// Multer configuration for memory storage (we'll upload to S3 directly)
exports.multerConfig = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: maxFileSize,
        files: 5 // Maximum 5 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('File type not allowed. Please upload PDF, Word documents, or images only.'));
        }
    }
});
// Utility function to get file info from S3
const getFileInfo = async (fileName) => {
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
    }
    catch (error) {
        return { exists: false };
    }
};
exports.getFileInfo = getFileInfo;
exports.default = {
    uploadFileToS3: exports.uploadFileToS3,
    generateSignedUrl: exports.generateSignedUrl,
    deleteFileFromS3: exports.deleteFileFromS3,
    getFileInfo: exports.getFileInfo,
    multerConfig: exports.multerConfig
};
