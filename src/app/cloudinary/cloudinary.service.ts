import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { CloudinaryUploadResult } from './interfaces/cloudinary-upload-result';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  /**
   * Upload a file to Cloudinary
   *
   * Handles file upload, optimization, and storage.
   * Returns secure HTTPS URL for accessing the file.
   *
   * File Processing:
   * 1. Receive file buffer from request
   * 2. Upload to Cloudinary
   * 3. Apply optimizations (quality, format)
   * 4. Extract metadata
   * 5. Return secure URLs
   *
   * @param fileBuffer - File buffer from Express request
   * @param fileName - Original file name
   * @param folder - Cloudinary folder path
   * @param tags - Tags for organization and querying
   *
   * @returns Upload response with URLs and metadata
   *
   * @throws BadRequestException - If file format not supported or upload fails
   *
   * @example
   * const response = await cloudinaryService.uploadFile(
   *   fileBuffer,
   *   'national_id.jpg',
   *   'seller/550e8400-e29b-41d4-a716-446655440000/id_verification',
   *   ['seller', 'id_verification']
   * );
   *
   * // Response:
   * {
   *   "publicId": "seller/550e.../ID_FRONT_1704000000000",
   *   "secureUrl": "https://res.cloudinary.com/kopa/...",
   *   "thumbnailUrl": "https://res.cloudinary.com/kopa/...",
   *   "fileName": "national_id.jpg",
   *   "fileSize": 245823,
   *   "dimensions": "1920x1080",
   *   "format": "jpg",
   *   "metadata": { ... }
   * }
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
    tags: string[],
  ): Promise<CloudinaryUploadResult> {
    //  Promise<{
    //   publicId: string;
    //   secureUrl: string;
    //   thumbnailUrl: string;
    //   fileName: string;
    //   fileSize: number;
    //   dimensions: string;
    //   format: string;
    //   metadata: Record<string, any>;
    // }>

    // Validate file type
    const allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      throw new BadRequestException(
        `File format not supported. Allowed: ${allowedFormats.join(', ')}`,
      );
    }

    // Generate unique public ID to avoid conflicts
    const timestamp = Date.now();
    const publicId = `${folder}/${fileName.split('.')[0]}_${timestamp}`;

    this.logger.debug(`Uploading file: ${fileName} to folder: ${folder}`);

    // Upload to Cloudinary with optimization
    const response: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // File organization
          public_id: publicId,
          folder: folder,

          // Security
          resource_type: 'auto',
          type: 'upload',

          // Optimization
          quality: 'auto',
          fetch_format: 'auto',

          // Tags for easy querying and management
          tags: tags,

          // Metadata
          overwrite: false, // Don't overwrite existing files
          invalidate: false, // No need to invalidate cache
        },
        (error, result) => {
          if (error) {
            return reject(
              new Error(
                typeof error === 'string' ? error : JSON.stringify(error),
              ),
            );
          }

          if (!result) {
            return reject(
              new Error('Upload failed: No result returned from Cloudinary'),
            );
          }

          resolve(result);
        },
      );

      uploadStream.end(fileBuffer);
    });

    // Generate thumbnail URL (200x200 optimized preview)
    const thumbnailUrl = cloudinary.url(response.public_id, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
    });

    this.logger.log(
      `File uploaded successfully: ${response.public_id} (${response.bytes} bytes)`,
    );

    return {
      publicId: response.public_id,
      secureUrl: response.secure_url,
      thumbnailUrl: thumbnailUrl,
      fileName: fileName,
      fileSize: response.bytes,
      dimensions: `${response.width}x${response.height}`,
      format: response.format,
      metadata: {
        public_id: response.public_id,
        width: response.width,
        height: response.height,
        format: response.format,
        bytes: response.bytes,
        created_at: response.created_at,
        resource_type: response.resource_type,
        type: response.type,
        url: response.url,
        secure_url: response.secure_url,
        tags: response.tags,
        etag: response.etag,
        version: response.version,
      },
    };
  }

  /**
   * Delete a file from Cloudinary
   *
   * Removes file permanently from Cloudinary storage.
   * Use when document needs to be replaced or account deleted.
   *
   * @param publicId - Cloudinary public ID of file to delete
   * @returns Deletion result
   *
   * @example
   * await cloudinaryService.deleteFile(
   *   'seller/550e.../ID_FRONT_1704000000000'
   * );
   */
  async deleteFile(publicId: string): Promise<void> {
    this.logger.debug(`Deleting file: ${publicId}`);

    const result = (await cloudinary.uploader.destroy(publicId)) as {
      result: 'ok' | 'not found' | 'error';
    };

    if (result.result === 'ok') {
      this.logger.log(`File deleted successfully: ${publicId}`);
      return;
    }

    if (result.result === 'not found') {
      this.logger.warn(`File not found in Cloudinary: ${publicId}`);
      return;
    }

    this.logger.error(`Cloudinary deletion failed: ${publicId}`);
    throw new InternalServerErrorException(
      'Failed to delete file from Cloudinary',
    );
  }

  /**
   * Validate file before upload
   *
   * Checks file size and format constraints.
   * Call this before uploading to provide quick feedback to user.
   *
   * Constraints:
   * - Max 1MB file size
   * - Allowed formats: jpg, jpeg, png, gif, webp
   *
   * @param fileBuffer - File buffer
   * @param fileName - File name with extension
   * @param maxSizeMB - Max file size in MB (default: 1)
   *
   * @returns true if valid, throws exception if invalid
   *
   * @example
   * try {
   *   cloudinaryService.validateFile(buffer, 'image.jpg', 1);
   *   // File is valid, proceed with upload
   * } catch (error) {
   *   // Handle validation error
   * }
   */
  validateFile(
    fileBuffer: Buffer,
    fileName: string,
    maxSizeMB: number = 1,
  ): boolean {
    // Check file size
    const fileSizeInMB = fileBuffer.length / 1024 / 1024;
    if (fileSizeInMB > maxSizeMB) {
      throw new BadRequestException(
        `File size ${fileSizeInMB.toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
      );
    }

    // Check file format
    const allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      throw new BadRequestException(
        `File format not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
      );
    }

    return true;
  }
}
