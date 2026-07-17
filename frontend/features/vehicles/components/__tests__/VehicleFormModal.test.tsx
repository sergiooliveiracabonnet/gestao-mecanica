import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VehicleListItemResponse } from '@oficina/contracts';
import { VehicleFormModal } from '../VehicleFormModal';
import { vehiclesApi } from '../../api/vehicles-api';
import { customersApi } from '@/features/customers/api/customers-api';

vi.mock('../../api/vehicles-api', () => ({
  vehiclesApi: { create: vi.fn(), update: vi.fn() },
}));

vi.mock('@/features/customers/api/customers-api', () => ({
  customersApi: { list: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const customer = { id: 'c1', tenantId: 't1', type: 'PF' as const, document: '11144477735', name: 'João da Silva', phone: '11999998888', createdAt: '2026-01-01T00:00:00Z' };

const editingVehicle: VehicleListItemResponse = {
  id: 'v1',
  tenantId: 't1',
  customerId: 'c1',
  customerName: 'João da Silva',
  brand: 'Fiat',
  model: 'Uno',
  plate: 'ABC1D23',
  photos: [],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('VehicleFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customersApi.list).mockResolvedValue({ items: [customer], total: 1, offset: 0, limit: 100, hasMore: false });
  });

  it('shows the customer picker in create mode', async () => {
    renderWithClient(<VehicleFormModal open onOpenChange={() => {}} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar veículo/i })).toBeInTheDocument();
  });

  it('hides the customer picker in edit mode and shows the owner as read-only text', () => {
    renderWithClient(<VehicleFormModal open onOpenChange={() => {}} vehicle={editingVehicle} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fiat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitted empty in create mode', async () => {
    const user = userEvent.setup();
    renderWithClient(<VehicleFormModal open onOpenChange={() => {}} />);

    await user.click(screen.getByRole('button', { name: /cadastrar veículo/i }));

    expect(await screen.findByText(/selecione um cliente/i)).toBeInTheDocument();
    expect(vehiclesApi.create).not.toHaveBeenCalled();
  });

  it('submits only the editable fields in edit mode, without customerId', async () => {
    vi.mocked(vehiclesApi.update).mockResolvedValue({ vehicle: editingVehicle });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderWithClient(<VehicleFormModal open onOpenChange={onOpenChange} vehicle={editingVehicle} />);

    const plateInput = screen.getByLabelText(/placa/i);
    await user.clear(plateInput);
    await user.type(plateInput, 'XYZ9W88');
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(vehiclesApi.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1', plate: 'XYZ9W88' })));
    expect(vehiclesApi.update).not.toHaveBeenCalledWith(expect.objectContaining({ customerId: expect.anything() }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
