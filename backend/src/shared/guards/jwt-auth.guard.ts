import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UserRole } from '@oficina/contracts';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      (request as Request & { user: AuthenticatedUser }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers['authorization'];
    if (!header) {
      return undefined;
    }
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
