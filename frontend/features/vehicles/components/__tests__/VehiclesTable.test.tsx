import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VehicleListItemResponse } from '@oficina/contracts';
import { VehiclesTable } from '../VehiclesTable';

const vehicle: VehicleListItemResponse = {
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

function noop() {}

describe('VehiclesTable', () => {
  it('shows a loading state', () => {
    render(<VehiclesTable items={[]} isLoading isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole('status', { name: /carregando veículos/i })).toBeInTheDocument();
  });

  it('shows an error state with a retry button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<VehiclesTable items={[]} isLoading={false} isError onRetry={onRetry} canManage onEdit={noop} onDelete={noop} />);

    expect(screen.getByText(/não foi possível carregar os veículos/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows an empty state', () => {
    render(<VehiclesTable items={[]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);
    expect(screen.getByText(/nenhum veículo ainda/i)).toBeInTheDocument();
  });

  it('renders vehicle rows with the owning customer name and action buttons when canManage is true', () => {
    render(<VehiclesTable items={[vehicle]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);

    expect(screen.getByText('Fiat')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
  });

  it('hides action buttons when canManage is false (MECHANIC)', () => {
    render(<VehiclesTable items={[vehicle]} isLoading={false} isError={false} onRetry={noop} canManage={false} onEdit={noop} onDelete={noop} />);

    expect(screen.getByText('Fiat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('calls onEdit/onDelete with the clicked vehicle', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<VehiclesTable items={[vehicle]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith(vehicle);

    await user.click(screen.getByRole('button', { name: /excluir/i }));
    expect(onDelete).toHaveBeenCalledWith(vehicle);
  });
});
