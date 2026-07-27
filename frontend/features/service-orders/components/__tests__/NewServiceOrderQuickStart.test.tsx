import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewServiceOrderQuickStart } from '../NewServiceOrderQuickStart';

const mocks = vi.hoisted(() => ({
  customers: { data: { items: [] as Array<{ id: string; name: string; document: string; phone: string }> }, isFetching: false },
  vehicles: { data: { items: [] as Array<{ id: string; customerId: string; customerName: string; brand: string; model: string; plate: string }> }, isFetching: false },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/customers/hooks/use-customers', () => ({ useCustomersList: () => mocks.customers }));
vi.mock('@/features/vehicles/hooks/use-vehicles', () => ({ useVehiclesList: () => mocks.vehicles }));
vi.mock('@/features/customers/components/CustomerFormModal', () => ({ CustomerFormModal: () => null }));
vi.mock('@/features/vehicles/components/VehicleFormModal', () => ({ VehicleFormModal: () => null }));
vi.mock('../ServiceOrderFormModal', () => ({ ServiceOrderFormModal: () => null }));

describe('NewServiceOrderQuickStart', () => {
  beforeEach(() => {
    mocks.customers.data.items = [];
    mocks.vehicles.data.items = [];
  });

  it('opens a centered search dialog', async () => {
    const user = userEvent.setup();
    render(<NewServiceOrderQuickStart />);

    await user.click(screen.getByRole('button', { name: 'Novo atendimento' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pesquisar cliente ou veículo' })).toHaveFocus();
  });

  it('offers a new registration when no result is found', async () => {
    const user = userEvent.setup();
    render(<NewServiceOrderQuickStart />);
    await user.click(screen.getByRole('button', { name: 'Novo atendimento' }));
    await user.type(screen.getByRole('textbox', { name: 'Pesquisar cliente ou veículo' }), 'inexistente');

    await waitFor(() => expect(screen.getByRole('button', { name: /adicionar novo/i })).toBeInTheDocument());
  });

  it('shows matching customers and lets the operator select one', async () => {
    mocks.customers.data.items = [{ id: 'customer-1', name: 'Sergio Oliveira', document: '12345678900', phone: '11999999999' }];
    const user = userEvent.setup();
    render(<NewServiceOrderQuickStart />);
    await user.click(screen.getByRole('button', { name: 'Novo atendimento' }));
    await user.type(screen.getByRole('textbox', { name: 'Pesquisar cliente ou veículo' }), 'Sergio');

    await user.click(await screen.findByRole('button', { name: /Sergio Oliveira/i }));

    expect(screen.getByText('Cliente selecionado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar veículo/i })).toBeInTheDocument();
  });
});
