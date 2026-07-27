import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MaintenanceAlertListItemResponse } from '@oficina/contracts';
import { MaintenanceAlertsTable } from '../MaintenanceAlertsTable';
import { maintenanceAlertsApi } from '../../api/maintenance-alerts-api';

vi.mock('../../api/maintenance-alerts-api', () => ({
  maintenanceAlertsApi: { resolve: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

function noop() {}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const alert: MaintenanceAlertListItemResponse = {
  id: 'alert-1',
  tenantId: 't1',
  vehicleId: 'v1',
  vehicleBrand: 'Fiat',
  vehicleModel: 'Uno',
  vehiclePlate: 'ABC1D23',
  customerId: 'c1',
  customerName: 'João da Silva',
  referenceDate: '2026-01-01T00:00:00Z',
  monthsOverdue: 7,
  status: 'OPEN',
};

describe('MaintenanceAlertsTable', () => {
  it('shows a loading state', () => {
    renderWithClient(<MaintenanceAlertsTable items={[]} isLoading isError={false} onRetry={noop} />);
    expect(screen.getByRole('status', { name: /carregando alertas de manutenção/i })).toBeInTheDocument();
  });

  it('shows an error state with a retry button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithClient(<MaintenanceAlertsTable items={[]} isLoading={false} isError onRetry={onRetry} />);

    expect(screen.getByText(/não foi possível carregar os alertas de manutenção/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows an empty state when there are no alerts', () => {
    renderWithClient(<MaintenanceAlertsTable items={[]} isLoading={false} isError={false} onRetry={noop} />);
    expect(screen.getByText(/nenhum veículo devendo revisão no momento/i)).toBeInTheDocument();
  });

  it('renders vehicle, customer and months overdue', () => {
    renderWithClient(<MaintenanceAlertsTable items={[alert]} isLoading={false} isError={false} onRetry={noop} />);

    expect(screen.getByText(/Fiat Uno · ABC1D23/)).toBeInTheDocument();
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('7 meses')).toBeInTheDocument();
  });

  it('does not show the resolve button for an already RESOLVED alert', () => {
    renderWithClient(<MaintenanceAlertsTable items={[{ ...alert, status: 'RESOLVED' }]} isLoading={false} isError={false} onRetry={noop} />);

    expect(screen.queryByRole('button', { name: /marcar como resolvido/i })).not.toBeInTheDocument();
  });

  it('resolving an alert calls the mutation and disables the button while pending', async () => {
    vi.mocked(maintenanceAlertsApi.resolve).mockResolvedValue({ alert: { ...alert, status: 'RESOLVED' } as never });
    const user = userEvent.setup();
    renderWithClient(<MaintenanceAlertsTable items={[alert]} isLoading={false} isError={false} onRetry={noop} />);

    const button = screen.getByRole('button', { name: /marcar como resolvido/i });
    await user.click(button);

    expect(maintenanceAlertsApi.resolve).toHaveBeenCalledWith({ id: 'alert-1' });
  });
});
