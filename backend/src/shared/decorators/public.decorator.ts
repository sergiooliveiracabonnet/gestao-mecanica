import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota como isenta do JwtAuthGuard global (signup, login, refresh,
// accept-invite).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
