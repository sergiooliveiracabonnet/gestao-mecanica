import type { ServiceOrderPhotoCategory } from '../response/service-order-photo.response';

export interface UploadServiceOrderPhotoRequest {
  serviceOrderId: string;
  category: ServiceOrderPhotoCategory;
  caption?: string;
}

export interface DeleteServiceOrderPhotoRequest {
  id: string;
}
