import axios from 'axios';
import { stringToCamelCase } from '@oficina/contracts';
import { keysToCamel, keysToSnake } from '../case-convert';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

apiClient.interceptors.request.use((config) => {
  if (config.data && typeof config.data === 'object') {
    config.data = keysToSnake(config.data);
  }
  return config;
});

apiClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object') {
    response.data = keysToCamel(response.data);
  }
  return response;
});

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

interface BackendErrorBody {
  error?: {
    code?: string;
    message?: string;
    status?: number;
    details?: Array<{ field: string; message: string }>;
  };
}

const DEFAULT_ERROR_MESSAGE = 'Algo deu errado. Tente novamente.';

// Regra API_ERROR_MESSAGES: nunca mostrar o `.message` genérico do axios
// ("Request failed with status code 400") — sempre extrair a mensagem
// estruturada que o backend devolve.
export function extractErrorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    return body?.error?.message ?? fallback;
  }
  return fallback;
}

// `detail.field` volta em snake_case do backend (ex: "tenant_name") — os
// campos de formulário no frontend são camelCase (ex: register('tenantName')),
// então convertemos a chave para poder casar com `setError(fieldName, ...)`.
export function extractFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    const details = body?.error?.details ?? [];
    return Object.fromEntries(details.map((detail) => [stringToCamelCase(detail.field), detail.message]));
  }
  return {};
}

export function extractErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    return body?.error?.code;
  }
  return undefined;
}
