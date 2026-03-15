import { SQSClient } from '@aws-sdk/client-sqs';

export const sqs = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});



/*
| Requests per month | Cost    |
| ------------------ | ------- |
| 1M                 | Free    |
| 5M                 | ~$1.60  |
| 10M                | ~$3.60  |
| 100M               | ~$39.60 |

*/