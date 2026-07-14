import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthStatus } from '../HealthStatus';

describe('HealthStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows loading state first', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );

    render(<HealthStatus />);

    expect(screen.getByText(/verificando conexão/i)).toBeInTheDocument();
  });

  it('shows success state when backend responds ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', timestamp: '2026-07-14T12:00:00.000Z' }),
      }),
    );

    render(<HealthStatus />);

    await waitFor(() => expect(screen.getByText(/backend conectado/i)).toBeInTheDocument());
  });

  it('shows error state when backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    );

    render(<HealthStatus />);

    await waitFor(() => expect(screen.getByText(/backend indisponível/i)).toBeInTheDocument());
  });
});
