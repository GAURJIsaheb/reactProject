import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from './s3Client.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from "dotenv"
dotenv.config();


const BUCKET = process.env.AWS_BUCKET_NAME;

// Upload buffer to S3, return permanent public URL (or signed URL)
export async function uploadImageToS3(fileBuffer, mimeType, userId) {
  const ext = mimeType.split('/')[1]; // e.g. jpeg, png
  const key = `tasks/${userId}/${uuidv4()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    // Remove ACL if your bucket doesn't allow public ACLs
    // Instead we'll use signed URLs
  }));

  return key; // store key in MongoDB, generate signed URL on read
}

// Generate a signed URL valid for N seconds (default 1 hour)
export async function getSignedImageUrl(key, expiresIn = 3600) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// Delete image from S3
export async function deleteImageFromS3(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}