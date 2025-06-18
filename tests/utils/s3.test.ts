import {
  createBucket,
  listBuckets,
  uploadObject,
  downloadObject,
  deleteObject,
  listObjects,
  getObjectUrl,
  checkObjectExists
} from '../../src/utils/s3';
import { config } from '../../src/config';

// Test bucket and object names
const TEST_BUCKET = 'test-bucket-' + Date.now();
const TEST_OBJECT = 'test-object.txt';
const TEST_CONTENT = 'Hello, MinIO!';

describe('S3 Utils with MinIO', () => {
  beforeAll(async () => {
    // Ensure we're using MinIO
    expect(config.s3.useMinio).toBe(true);
  });

  afterAll(async () => {
    // Cleanup: Delete test bucket and its contents
    try {
      const objects = await listObjects(TEST_BUCKET);
      for (const object of objects) {
        await deleteObject(TEST_BUCKET, object);
      }
      // Note: MinIO doesn't support bucket deletion through the S3 API
      // You might need to implement a separate cleanup mechanism
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Bucket Operations', () => {
    it('should create a new bucket', async () => {
      await expect(createBucket(TEST_BUCKET)).resolves.not.toThrow();
    });

    it('should list buckets and include the test bucket', async () => {
      const buckets = await listBuckets();
      expect(buckets).toContain(TEST_BUCKET);
    });
  });

  describe('Object Operations', () => {
    it('should upload an object', async () => {
      await expect(
        uploadObject(TEST_BUCKET, TEST_OBJECT, TEST_CONTENT, 'text/plain')
      ).resolves.not.toThrow();
    });

    it('should check if object exists', async () => {
      const exists = await checkObjectExists(TEST_BUCKET, TEST_OBJECT);
      expect(exists).toBe(true);
    });

    it('should download an object and verify content', async () => {
      const content = await downloadObject(TEST_BUCKET, TEST_OBJECT);
      expect(content.toString()).toBe(TEST_CONTENT);
    });

    it('should list objects in bucket', async () => {
      const objects = await listObjects(TEST_BUCKET);
      expect(objects).toContain(TEST_OBJECT);
    });

    it('should generate a signed URL for the object', async () => {
      const url = await getObjectUrl(TEST_BUCKET, TEST_OBJECT);
      expect(url).toContain(TEST_BUCKET);
      expect(url).toContain(TEST_OBJECT);
    });

    it('should delete an object', async () => {
      await expect(deleteObject(TEST_BUCKET, TEST_OBJECT)).resolves.not.toThrow();
      const exists = await checkObjectExists(TEST_BUCKET, TEST_OBJECT);
      expect(exists).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent object', async () => {
      const exists = await checkObjectExists(TEST_BUCKET, 'non-existent.txt');
      expect(exists).toBe(false);
    });

    it('should throw error when downloading non-existent object', async () => {
      await expect(
        downloadObject(TEST_BUCKET, 'non-existent.txt')
      ).rejects.toThrow();
    });
  });
});