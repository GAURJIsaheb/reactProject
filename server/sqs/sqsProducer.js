import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqs } from './sqsClient.js';

const QUEUE_URL = process.env.SQS_QUEUE_URL;

export async function sendForgotPasswordMessage({ email, resetUrl, userName }) {
  if (!QUEUE_URL) {
    throw new Error("SQS_QUEUE_URL not set - cannot enqueue forgot-password email");
  }
  const message = {
    type:     'FORGOT_PASSWORD',
    email,
    resetUrl,
    userName: userName || 'User',
    sentAt:   Date.now(),
  };

  await sqs.send(new SendMessageCommand({
    QueueUrl:    QUEUE_URL,
    MessageBody: JSON.stringify(message),
  }));

  console.log(`📨 SQS message queued for: ${email}`);
}
