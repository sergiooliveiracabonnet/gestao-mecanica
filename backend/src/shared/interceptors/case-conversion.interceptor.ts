import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { keysToSnake } from '@oficina/contracts';
import { map, Observable } from 'rxjs';

// Converte o corpo de toda resposta de sucesso de camelCase (código TS) para
// snake_case (JSON na rede) — o espelho, do lado do backend, do interceptor
// axios que o frontend usa. Respostas de erro passam pelo HttpExceptionFilter,
// não por aqui (filters rodam fora da cadeia de interceptors).
@Injectable()
export class CaseConversionInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => (data && typeof data === 'object' ? keysToSnake(data) : data)));
  }
}
