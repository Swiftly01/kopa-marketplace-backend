export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  fileName: string;
  dimensions?: string;
  format: string;
  metadata?: Record<string, any>;
}
