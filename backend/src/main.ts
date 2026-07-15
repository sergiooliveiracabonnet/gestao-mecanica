import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Wildcard CORS is fine while the only endpoint is an unauthenticated,
  // non-sensitive health check. Scope this down to an explicit origin list
  // before Feature 2 (IAM) introduces cookies/auth — wildcard CORS +
  // credentials is a real vulnerability.
  app.enableCors();
  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
