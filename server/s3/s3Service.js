import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from './s3Client.js';
import { v4 as uuidv4 } from 'uuid';

const BUCKET     = process.env.AWS_BUCKET_NAME;
const EXPIRES_IN = 7 * 24 * 60 * 60; // url expiration time,,,

export async function uploadImageToS3(fileBuffer, mimeType, userId, folder = 'tasks') {
  const ext = mimeType.split('/')[1] || 'jpg';//proper xtension png or jpeg...or fdefault jpg
  const key = `${folder}/${userId}/${uuidv4()}.${ext}`;
  
  console.log('🪣 Uploading to bucket:', process.env.AWS_BUCKET_NAME);
  //console.log('🔑 Key:', key);
  //console.log('📏 Buffer size:', fileBuffer?.length);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  console.log('✅ PutObject done');
  return key;
}

export async function generateSignedUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
}

export async function deleteImageFromS3(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}


export async function resolveImageUrl(task, TaskModel) {
  if (!task.image) return task;

  const now    = Date.now();
  const buffer = 5 * 60 * 1000;

  if (task.imageUrl && task.imageUrlExpiry && (task.imageUrlExpiry - now) > buffer) {//task without image
    return task; // still valid
  }

  const imageUrl       = await generateSignedUrl(task.image);
  const imageUrlExpiry = now + EXPIRES_IN * 1000;

  // fire-and-forget DB update
  TaskModel.updateOne({ taskId: task.taskId }, { imageUrl, imageUrlExpiry }).exec();

  return { ...task, imageUrl, imageUrlExpiry };
}
