import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceOrderPhotoManager } from './service-order-photo.manager';

const user = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' as const };
const file = { originalname: 'entrada.jpg', mimetype: 'image/jpeg', size: 100, buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) } as Express.Multer.File;
const photo = { id: 'photo-1', tenantId: 'tenant-1', serviceOrderId: 'order-1', category: 'ENTRY', caption: null, storageKey: 'key.jpg', originalName: 'entrada.jpg', mimeType: 'image/jpeg', sizeBytes: 100, createdAt: new Date(), updatedAt: null, deletedAt: null };

function build() {
  const orders = { byId: jest.fn().mockResolvedValue({ id: 'order-1' }) };
  const photos = { insert: jest.fn().mockResolvedValue(photo), list: jest.fn().mockResolvedValue([photo]), byId: jest.fn().mockResolvedValue(photo), softDelete: jest.fn().mockResolvedValue({ count: 1 }) };
  const storage = { save: jest.fn().mockResolvedValue('key.jpg'), read: jest.fn().mockResolvedValue(Buffer.from('image')), delete: jest.fn() };
  const audit = { record: jest.fn() };
  return { manager: new ServiceOrderPhotoManager(orders as never, photos as never, storage as never, audit as never), orders, photos, storage };
}

describe('ServiceOrderPhotoManager', () => {
  it('uploads a valid photo linked to a visible service order', async () => {
    const { manager, storage, photos } = build();
    const result = await manager.upload(user as never, { serviceOrderId: 'order-1', category: 'ENTRY' }, file);
    expect(storage.save).toHaveBeenCalled();
    expect(photos.insert).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', category: 'ENTRY' }));
    expect(result.photo.id).toBe('photo-1');
  });

  it('rejects unsupported files before writing', async () => {
    const { manager, storage } = build();
    await expect(manager.upload(user as never, { serviceOrderId: 'order-1', category: 'ENTRY' }, { ...file, mimetype: 'application/pdf' })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('rejects a file whose declared type does not match its content', async () => {
    const { manager, storage } = build();
    await expect(manager.upload(user as never, { serviceOrderId: 'order-1', category: 'ENTRY' }, { ...file, buffer: Buffer.from('not an image') })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('rejects a photo when the service order is outside the tenant', async () => {
    const { manager, orders } = build();
    orders.byId.mockResolvedValue(null);
    await expect(manager.upload(user as never, { serviceOrderId: 'order-1', category: 'ENTRY' }, file)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft deletes metadata and removes the stored file', async () => {
    const { manager, photos, storage } = build();
    await manager.delete(user as never, 'photo-1');
    expect(photos.softDelete).toHaveBeenCalledWith('photo-1');
    expect(storage.delete).toHaveBeenCalledWith('key.jpg');
  });
});
