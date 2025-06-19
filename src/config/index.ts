import dotenv from 'dotenv';
import { AppError } from '../utils/custom-errors';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.3
  },

  s3: {
    apiKey: process.env.S3_API_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin123',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET || 'pw-agent-local',
    useMinio: process.env.USE_MINIO === 'true',
  },

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost'
  },

  app: {
    maxRequestsPerMinute: 10,
    requestTimeoutMs: 30000,
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

if (!config.openai.apiKey) {
  throw new AppError('OPENAI_API_KEY environment variable is required', 500);
}
