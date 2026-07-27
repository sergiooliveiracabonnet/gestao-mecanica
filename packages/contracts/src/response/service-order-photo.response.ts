export const SERVICE_ORDER_PHOTO_CATEGORIES = ['ENTRY', 'ISSUE', 'RESOLVED', 'EXIT'] as const;
export type ServiceOrderPhotoCategory = (typeof SERVICE_ORDER_PHOTO_CATEGORIES)[number];

export interface ServiceOrderPhotoResponse {
  id: string;
  serviceOrderId: string;
  category: ServiceOrderPhotoCategory;
  caption?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
