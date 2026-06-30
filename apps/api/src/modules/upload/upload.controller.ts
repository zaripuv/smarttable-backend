import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('product-image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'products');
  }

  @Post('restaurant-logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a restaurant logo' })
  @ApiResponse({ status: 201, description: 'Logo uploaded' })
  async uploadRestaurantLogo(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'restaurants');
  }

  @Post('category-image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a category image' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadCategoryImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'categories');
  }

  @Post('qr-image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a QR code image' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadQRImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'qr-codes');
  }

  @Delete(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete an uploaded file' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(@Param('key') key: string) {
    await this.uploadService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }
}
