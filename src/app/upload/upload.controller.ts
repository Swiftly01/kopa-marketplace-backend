import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { UploadFileDto } from './dtos/upload-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CloudinaryFolders } from '../cloudinary/enums/cloudinary-folders.enum';

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: undefined,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const folder = dto.folder ?? this.defaultFolder(file.mimetype);
        const { allowedFormats, resourceType } = this.optionsFor(
          file.mimetype,
          dto.resourceType,
        );

        try {
          const result = await this.cloudinaryService.uploadFile(
            file.buffer,
            file.originalname,
            folder,
            ['chat', 'media'],
            { allowedFormats, resourceType },
          );

          return {
            url: result.secureUrl,
            publicId: result.publicId,
            fileName: result.fileName,
            format: result.format,
            size: result.fileSize,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Upload failed';
          throw new BadRequestException(
            `Failed to upload "${file.originalname}": ${message}`,
          );
        }
      }),
    );

    return { files: uploadResults };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Query('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('publicId query parameter is required');
    }

    await this.cloudinaryService.deleteFile(publicId);
  }

  private defaultFolder(mimeType: string): CloudinaryFolders {
    if (mimeType.startsWith('image/')) return CloudinaryFolders.CHAT_IMAGES;
    if (mimeType.startsWith('audio/')) return CloudinaryFolders.CHAT_AUDIO;
    return CloudinaryFolders.CHAT_FILES;
  }

  private optionsFor(
    mimeType: string,
    override?: 'image' | 'raw' | 'auto',
  ): {
    allowedFormats: string[];
    resourceType: 'image' | 'video' | 'raw' | 'auto';
  } {
    if (mimeType.startsWith('image/')) {
      return {
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resourceType: override ?? 'image',
      };
    }

    if (mimeType.startsWith('audio/')) {
      // Cloudinary stores audio under the "video" resource type.
      return {
        allowedFormats: ['webm', 'mp3', 'wav', 'm4a', 'ogg', 'aac', 'mp4'],
        resourceType: override === 'auto' ? 'auto' : 'video',
      };
    }

    return {
      allowedFormats: [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'txt',
        'csv',
        'zip',
        'rtf',
      ],
      resourceType: override ?? 'raw',
    };
  }
}
