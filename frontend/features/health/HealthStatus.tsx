'use client';

import { useBackendHealth } from './useBackendHealth';

const BADGE_STYLES: Record<string, string> = {
  loading: 'bg-surface text-text-muted border-border',
  success: 'bg-success/10 text-success border-success/30',
  error: 'bg-danger/10 text-danger border-danger/30',
};

export function HealthStatus() {
  const health = useBackendHealth();

  return (
    <div
      role="status"
      className={`flex flex-col gap-1 rounded-card border px-4 py-3 text-sm ${BADGE_STYLES[health.status]}`}
    >
      {health.status === 'loading' && <span>● Verificando conexão...</span>}
      {health.status === 'success' && (
        <>
          <span>● Backend conectado</span>
          <span className="text-xs text-text-muted">
            GET /health → 200 ok ({new Date(health.timestamp).toLocaleTimeString('pt-BR')})
          </span>
        </>
      )}
      {health.status === 'error' && (
        <>
          <span>● Backend indisponível</span>
          <span className="text-xs">{health.message}</span>
        </>
      )}
    </div>
  );
}
