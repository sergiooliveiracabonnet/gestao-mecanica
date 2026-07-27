import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceOrderPhotoGallery } from '../ServiceOrderPhotoGallery';

vi.mock('../../hooks/use-service-orders', () => ({
  useServiceOrderPhotos: () => ({ data: { photos: [] }, isLoading: false, isError: false }),
  useUploadServiceOrderPhoto: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteServiceOrderPhoto: () => ({ isPending: false, mutate: vi.fn() }),
  useServiceOrderPhotoBlob: () => ({ data: undefined }),
}));

describe('ServiceOrderPhotoGallery', () => {
  it('organizes the photographic evidence into the four workshop moments', () => {
    render(<ServiceOrderPhotoGallery serviceOrderId="order-1" canManage />);
    expect(screen.getByRole('heading', { name: /entrada do veículo/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /problemas encontrados/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /problemas corrigidos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /saída do veículo/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /adicionar/i })).toHaveLength(4);
  });

  it('hides upload actions for users without management permission', () => {
    render(<ServiceOrderPhotoGallery serviceOrderId="order-1" canManage={false} />);
    expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
  });
});
