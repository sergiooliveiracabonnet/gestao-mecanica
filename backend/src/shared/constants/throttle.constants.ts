// Limite mais restrito que o default global do ThrottlerModule — aplicado
// via @Throttle() em signup, login e accept-invite (spec: rate limiting
// básico contra brute-force/abuso nesses 3 endpoints).
export const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
