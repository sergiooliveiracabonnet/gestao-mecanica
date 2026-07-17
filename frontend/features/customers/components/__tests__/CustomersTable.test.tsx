import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CustomerListItemResponse } from '@oficina/contracts';
import { CustomersTable } from '../CustomersTable';

const customer: CustomerListItemResponse = {
  id: 'c1',
  tenantId: 't1',
  type: 'PF',
  document: '11144477735',
  name: 'João da Silva',
  phone: '11999998888',
  createdAt: '2026-01-01T00:00:00Z',
};

function noop() {}

describe('CustomersTable', () => {
  it('shows a loading state', () => {
    render(<CustomersTable items={[]} isLoading isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole('status', { name: /carregando clientes/i })).toBeInTheDocument();
  });

  it('shows an error state with a retry button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<CustomersTable items={[]} isLoading={false} isError onRetry={onRetry} canManage onEdit={noop} onDelete={noop} />);

    expect(screen.getByText(/não foi possível carregar os clientes/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows an empty state', () => {
    render(<CustomersTable items={[]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);
    expect(screen.getByText(/nenhum cliente ainda/i)).toBeInTheDocument();
  });

  it('renders customer rows with action buttons when canManage is true', () => {
    render(<CustomersTable items={[customer]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={noop} onDelete={noop} />);

    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('11144477735')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
  });

  it('hides action buttons when canManage is false (MECHANIC)', () => {
    render(
      <CustomersTable items={[customer]} isLoading={false} isError={false} onRetry={noop} canManage={false} onEdit={noop} onDelete={noop} />,
    );

    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('calls onEdit/onDelete with the clicked customer', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<CustomersTable items={[customer]} isLoading={false} isError={false} onRetry={noop} canManage onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith(customer);

    await user.click(screen.getByRole('button', { name: /excluir/i }));
    expect(onDelete).toHaveBeenCalledWith(customer);
  });
});
