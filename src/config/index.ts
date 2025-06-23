import dotenv from 'dotenv';
import { AppError } from '../utils/custom-errors';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.2
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20240620',
    maxTokens: 4000,
    temperature: 0.2
  },
  llmProvider: process.env.LLM_PROVIDER || 'openai',

  s3: {
    apiKey: process.env.S3_API_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin123',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET || 'pw-agent-local',
    useMinio: process.env.USE_MINIO === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'redispwd',
  },

  queue: {
    zipExtractionQueue: {
      name: 'zip-extraction',
      jobName: 'extract-zip',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      concurrency: 3,
    },
    traceAnalysisQueue: {
      name: 'trace-analysis',
      jobName: 'analyze-trace',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      concurrency: 1,
    },
  },

  websocket: {
    ANALYSIS_COMPLETED_CHANNEL: 'analysis_completed',
    FILE_PROCESSED_CHANNEL: 'file_processed',
    JOB_ERROR_CHANNEL: 'job_error',
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

if (!config.openai.apiKey && !config.anthropic.apiKey) {
  throw new AppError('Either OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable is required', 500);
}
