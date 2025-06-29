require('dotenv').config();
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const cors = require('cors');
const uuid = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
        : undefined
});

// Configure multer for S3 uploads
const s3Upload = multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${uuid.v4()}-${file.originalname}`;
        cb(null, `images/${uniqueName}`);
    }
});

// Configure multer for single file upload
const upload = multer({
    storage: s3Upload,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// Configure multer for multiple files
const uploadMultiple = multer({
    storage: s3Upload,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: 10 // max 10 files
    }
}).array('images', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 uploads

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Single image upload via form-data
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`,
                key: req.file.key,
                etag: req.file.etag
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Base64 image upload
app.post('/api/upload-base64', async (req, res) => {
    try {
        const { base64Data, filename } = req.body;

        if (!base64Data || !filename) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate base64 format
        if (!base64Data.startsWith('data:image/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid base64 format'
            });
        }

        const fileData = base64Data.split(',')[1];
        const mimeType = base64Data.split(';')[0].split('/')[1];
        const allowedTypes = ['jpeg', 'png', 'gif', 'webp'];

        if (!allowedTypes.includes(mimeType)) {
            return res.status(400).json({
                success: false,
                message: 'Only images are allowed'
            });
        }

        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${uuid.v4()}-${filename}`;
        const key = `images/${uniqueName}`;

        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: Buffer.from(fileData, 'base64'),
            ContentType: `image/${mimeType}`,
        };

        const upload = new Upload({
            client: s3Client,
            params: uploadParams
        });

        await upload.done();

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
                key: key,
                etag: upload.result.ETag
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Multiple image upload
app.post('/api/upload-multiple', uploadMultiple, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = req.files.map(file => ({
            url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`,
            key: file.key,
            etag: file.etag
        }));

        res.json({
            success: true,
            message: 'Files uploaded successfully',
            data: uploadedFiles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
