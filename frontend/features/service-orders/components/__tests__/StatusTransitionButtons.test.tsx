import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ServiceOrderStatus } from '@oficina/contracts';
import { StatusTransitionButtons } from '../StatusTransitionButtons';
import { serviceOrdersApi } from '../../api/service-orders-api';

vi.mock('../../api/service-orders-api', () => ({
  serviceOrdersApi: { transition: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('StatusTransitionButtons', () => {
  it.each([
    ['OPEN', ['Enviar para aprovação', 'Iniciar serviço', 'Cancelar OS']],
    ['AWAITING_APPROVAL', ['Iniciar serviço', 'Cancelar OS']],
    ['IN_PROGRESS', ['Aguardar peças', 'Marcar como concluída', 'Cancelar OS']],
    ['WAITING_PARTS', ['Iniciar serviço', 'Cancelar OS']],
    ['COMPLETED', ['Registrar entrega']],
  ] as Array<[ServiceOrderStatus, string[]]>)('renders exactly the valid transitions for %s', (status, expectedLabels) => {
    renderWithClient(<StatusTransitionButtons serviceOrderId="so1" status={status} />);

    for (const label of expectedLabels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(expectedLabels.length);
  });

  it.each(['DELIVERED', 'CANCELLED'] as ServiceOrderStatus[])('renders no buttons for terminal status %s', (status) => {
    const { container } = renderWithClient(<StatusTransitionButtons serviceOrderId="so1" status={status} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls the transition mutation with the clicked target status', async () => {
    vi.mocked(serviceOrdersApi.transition).mockResolvedValue({
      serviceOrder: { id: 'so1', status: 'IN_PROGRESS' } as never,
    });
    const user = userEvent.setup();
    renderWithClient(<StatusTransitionButtons serviceOrderId="so1" status="OPEN" />);

    await user.click(screen.getByRole('button', { name: 'Iniciar serviço' }));

    expect(serviceOrdersApi.transition).toHaveBeenCalledWith({ id: 'so1', toStatus: 'IN_PROGRESS' });
  });
});
