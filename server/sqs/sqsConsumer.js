//poller worker
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqs } from './sqsClient.js';
import { sendResetEmail } from './mailer.js';

const QUEUE_URL  = process.env.SQS_QUEUE_URL;
let   isRunning  = false;
// server/sqs/sqsConsumer.js — processMessage function
async function processMessage(message) {
  const body = JSON.parse(message.Body);
  console.log(`⚙️  Processing: ${body.type} for ${body.email}`);

  if (body.type === 'FORGOT_PASSWORD') {
    try {
      await sendResetEmail({
        to:       body.email,
        resetUrl: body.resetUrl,
        userName: body.userName,
      });
      console.log(`📧 Email sent successfully to: ${body.email}`);
    } catch (err) {
      console.error(`❌ Email send failed:`, err.message); // ← exact error 
      throw err; // ← rethrow ,,to prevent the msg to be deleted
    }
  }

  await sqs.send(new DeleteMessageCommand({
    QueueUrl:      QUEUE_URL,
    ReceiptHandle: message.ReceiptHandle,
  }));

  console.log(`✅ Message deleted from queue`);
}

async function pollQueue() {
  if (!isRunning) return;

  try {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl:            QUEUE_URL,
      MaxNumberOfMessages: 5,      // 5 msgs at a time
      WaitTimeSeconds:     10,     // long polling — cost efficient
      VisibilityTimeout:   30,     // wait for 30 sec,,if not happen go back to sqs
    }));

    const messages = response.Messages || [];

    if (messages.length > 0) {
      console.log(`📬 ${messages.length} message(s) received from SQS`);
      await Promise.allSettled(messages.map(processMessage));
    }
  } catch (err) {
    console.error('❌ SQS poll error:', err.message);
  }

  // Immediately poll again
  setImmediate(pollQueue);
}

export function startConsumer() {
  if (isRunning) return;
  isRunning = true;
  console.log('🔁 SQS Consumer started — polling queue...');
  pollQueue();
}

export function stopConsumer() {
  isRunning = false;
  console.log('🛑 SQS Consumer stopped');
}