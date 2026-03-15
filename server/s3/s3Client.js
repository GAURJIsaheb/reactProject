import { S3Client } from '@aws-sdk/client-s3';
import dotenv from "dotenv"
dotenv.config();

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


/*Price:
Typical price:

$0.023 per GB per month for the first 50 TB stored
*/