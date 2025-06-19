import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateBucketCommand,
  ListBucketsCommand,
  Bucket,
  _Object
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from './logger';
import { AppError, NotFoundError } from './custom-errors';

const s3Client = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.apiKey,
    secretAccessKey: config.s3.secretAccessKey,
  },
  forcePathStyle: config.s3.useMinio,
});

export async function createBucketIfNotExists(bucketName: string): Promise<void> {
  try {
    const existingBuckets = await listBuckets();
    if (!existingBuckets.includes(bucketName)) {
      await createBucket(bucketName);
      logger.info(`Bucket ${bucketName} created as it did not exist`);
    } else {
      logger.info(`Bucket ${bucketName} already exists`);
    }
  } catch (error) {
    logger.error(`Error in createBucketIfNotExists for bucket ${bucketName}:`, error);
    throw error;
  }
}

export async function createBucket(bucketName: string): Promise<void> {
  try {
    await s3Client.send(new CreateBucketCommand({
      Bucket: bucketName
    }));
    logger.info(`Bucket ${bucketName} created successfully`);
  } catch (error) {
    logger.error(`Error creating bucket ${bucketName}:`, error);
    throw new AppError(`Failed to create bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listBuckets(): Promise<string[]> {
  try {
    const response = await s3Client.send(new ListBucketsCommand({}));
    return response.Buckets?.map((bucket: Bucket) => bucket.Name || '') || [];
  } catch (error) {
    logger.error('Error listing buckets:', error);
    throw new AppError(`Failed to list buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function uploadObject({
    bucketName,
    objectName,
    data,
    contentType,
}: {
  bucketName: string,
  objectName: string,
  data: Buffer | string,
  contentType?: string
}): Promise<void> {
  try {
    logger.info(`Uploading object ${objectName} to bucket ${bucketName}`);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      Body: data,
      ContentType: contentType || 'application/octet-stream'
    }));
    logger.info(`Object ${objectName} uploaded successfully to bucket ${bucketName}`);
  } catch (error) {
    logger.error(`Error uploading object ${objectName}:`, error);
    throw new AppError(`Failed to upload object: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function downloadObject({ bucketName, objectName }: {
  bucketName: string,
  objectName: string
}): Promise<Buffer> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName
    }));

    if (!response.Body) {
      throw new NotFoundError('Empty response body');
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    logger.error(`Error downloading object ${objectName}:`, error);
    throw new AppError(`Failed to download object: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteObject({ bucketName, objectName }: {
  bucketName: string,
  objectName: string
}): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectName
    }));
    logger.info(`Object ${objectName} deleted successfully from bucket ${bucketName}`);
  } catch (error) {
    logger.error(`Error deleting object ${objectName}:`, error);
    throw new AppError(`Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listObjects({ bucketName, prefix }: {
  bucketName: string,
  prefix?: string
}): Promise<string[]> {
  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix
    }));

    return response.Contents?.map((object: _Object) => object.Key || '') || [];
  } catch (error) {
    logger.error(`Error listing objects in bucket ${bucketName}:`, error);
    throw new AppError(`Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getObjectUrl({
    bucketName,
    objectName,
    expirySeconds = 3600,
 }: {
  bucketName: string,
  objectName: string,
  expirySeconds?: number
}): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName
    });

    return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
  } catch (error) {
    logger.error(`Error generating URL for object ${objectName}:`, error);
    throw new AppError(`Failed to generate object URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkObjectExists({
    bucketName,
    objectName,
}:  {
  bucketName: string,
  objectName: string
}): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: objectName
    }));
    return true;
  } catch (error) {
    if ((error as any).name === 'NotFound') {
      return false;
    }
    throw new AppError(`Failed to check if object exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateOriginalTraceFilePath(traceFileId: string): string {
  return `traces/${traceFileId}/original.zip`;
}

export function generateMainTraceFilePath(traceFileId: string): string {
  return `traces/${traceFileId}/test.txt`;
}

export function generateNetworkTraceFilePath(traceFileId: string): string {
  return `traces/${traceFileId}/network.txt`;
}

export function generateStackTraceFilePath(traceFileId: string): string {
  return `traces/${traceFileId}/stacks.txt`;
}