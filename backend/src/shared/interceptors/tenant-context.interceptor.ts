import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import type { AuthenticatedUser } from '../guards/jwt-auth.guard';

// Interceptor, não Guard: precisa envolver toda a execução downstream
// (handler + tudo que ele chama) num único AsyncLocalStorage.run(), algo que
// um Guard (que só retorna true/false) não consegue fazer. Roda depois do
// JwtAuthGuard, que já populou `request.user`.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      this.tenantContext.run({ tenantId: user.tenantId, userId: user.userId, role: user.role }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
