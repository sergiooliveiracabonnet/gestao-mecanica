import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SERVICE_ORDER_PHOTO_CATEGORIES, type ServiceOrderPhotoCategory } from '@oficina/contracts';

export class ListServiceOrderPhotosDto {
  @IsUUID() serviceOrderId!: string;
}

export class GetServiceOrderPhotoDto {
  @IsUUID() id!: string;
}

export class UploadServiceOrderPhotoDto {
  @IsUUID() serviceOrderId!: string;
  @IsIn(SERVICE_ORDER_PHOTO_CATEGORIES) category!: ServiceOrderPhotoCategory;
  @IsOptional() @IsString() @MaxLength(300) caption?: string;
}

export class DeleteServiceOrderPhotoDto {
  @IsUUID() id!: string;
}
