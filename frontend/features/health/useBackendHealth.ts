'use client';

import { useEffect, useState } from 'react';

export type HealthState =
  | { status: 'loading' }
  | { status: 'success'; timestamp: string }
  | { status: 'error'; message: string };

export function useBackendHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    fetch(`${apiUrl}/health`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Backend respondeu com status ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setState({ status: 'success', timestamp: data.timestamp });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          setState({ status: 'error', message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
