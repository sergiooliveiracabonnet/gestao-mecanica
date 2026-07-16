import type { NextFunction, Request, Response } from 'express';
import { keysToCamel } from '@oficina/contracts';

// Converte o body da requisição (snake_case, como o frontend envia) para
// camelCase ANTES do ValidationPipe/class-transformer bindar nos DTOs —
// sem isso, `tenant_name` no JSON nunca preencheria `tenantName` na DTO.
export function snakeToCamelMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = keysToCamel(req.body);
  }
  next();
}
