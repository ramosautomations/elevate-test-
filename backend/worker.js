require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

console.log('🔧 Elevate Worker starting...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

// PDF Generation Queue (placeholder for now)
const pdfQueue = new Queue('pdf-generation', { connection });

// Email Queue (placeholder for now)
const emailQueue = new Queue('email-sending', { connection });

// PDF Worker
const pdfWorker = new Worker('pdf-generation', async (job) => {
  console.log(`Processing PDF job ${job.id}:`, job.data);
  
  // TODO: Implement PDF generation with Puppeteer
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, message: 'PDF generated (placeholder)' };
}, { connection });

// Email Worker
const emailWorker = new Worker('email-sending', async (job) => {
  console.log(`Processing email job ${job.id}:`, job.data);
  
  // TODO: Implement email sending with Resend
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true, message: 'Email sent (placeholder)' };
}, { connection });

pdfWorker.on('completed', (job) => {
  console.log(`✅ PDF job ${job.id} completed`);
});

pdfWorker.on('failed', (job, err) => {
  console.error(`❌ PDF job ${job.id} failed:`, err.message);
});

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

console.log('✅ Worker ready and listening for jobs');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing workers');
  await pdfWorker.close();
  await emailWorker.close();
  await connection.quit();
  process.exit(0);
});
