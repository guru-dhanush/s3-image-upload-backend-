# S3 Image Upload Backend

A Node.js Express backend for uploading images to AWS S3 bucket. This application supports both form-data and base64 image uploads, with multiple image upload capability.

## Features

- Single and multiple image uploads to S3
- Support for both form-data and base64 uploads
- File type validation (jpg, jpeg, png, gif, webp)
- File size limit (10MB per file)
- Unique file naming with timestamp
- Public URL generation for uploaded files
- AWS SDK v3 integration
- Designed for EC2 deployment with IAM role support

## Prerequisites

- Node.js (v14 or higher)
- AWS S3 bucket
- AWS credentials (or EC2 instance with IAM role)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your AWS credentials and S3 bucket name

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=your-bucket-name
```

## Running the Application

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## API Endpoints

### Health Check
- GET `/api/health`
- Returns server status

### Single Image Upload (Form-data)
- POST `/api/upload`
- Accepts `multipart/form-data` with field name `image`
- Response:
  ```json
  {
    "success": true,
    "message": "File uploaded successfully",
    "data": {
      "url": "https://your-bucket.s3.region.amazonaws.com/images/...",
      "key": "images/...",
      "etag": "..."
    }
  }
  ```

### Base64 Image Upload
- POST `/api/upload-base64`
- Accepts JSON payload with `base64Data` and `filename`
- Response format same as above

### Multiple Image Upload
- POST `/api/upload-multiple`
- Accepts `multipart/form-data` with field name `images[]`
- Response:
  ```json
  {
    "success": true,
    "message": "Files uploaded successfully",
    "data": [
      {
        "url": "https://your-bucket.s3.region.amazonaws.com/images/...",
        "key": "images/...",
        "etag": "..."
      },
      // ... more files
    ]
  }
  ```

## Error Handling

All endpoints return appropriate error messages with HTTP status codes:
- 400: Bad Request (validation errors)
- 404: Not Found (invalid routes)
- 500: Internal Server Error

## Security

- Files are stored directly in S3 (no local storage)
- File type validation
- Size limits enforced
- Public-read ACL for uploaded files
- CORS enabled

## Deployment

This application is optimized for deployment on AWS EC2 instances. When deploying:
1. Configure an IAM role with S3 write permissions
2. Attach the role to your EC2 instance
3. Deploy the application without AWS credentials (it will use the instance's IAM role)
4. Ensure your S3 bucket policy allows writes from the EC2 instance's IAM role

## Example Usage

### Form-data Upload (Single File)
```javascript
const formData = new FormData();
formData.append('image', file);

fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData
})
```

### Base64 Upload
```javascript
const base64Data = 'data:image/jpeg;base64,...';
const filename = 'image.jpg';

fetch('http://localhost:8000/api/upload-base64', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ base64Data, filename })
})
```

### Multiple Files Upload
```javascript
const formData = new FormData();
files.forEach(file => formData.append('images[]', file));

fetch('http://localhost:8000/api/upload-multiple', {
  method: 'POST',
  body: formData
})
```

## Troubleshooting

1. **Connection Issues**
   - Verify AWS credentials in .env file
   - Check S3 bucket permissions
   - Ensure correct region is set

2. **Upload Failures**
   - Check file size (max 10MB)
   - Verify file type (only images allowed)
   - Check S3 bucket policy

3. **Server Errors**
   - Check server logs
   - Verify dependencies are installed
   - Check for missing environment variables
