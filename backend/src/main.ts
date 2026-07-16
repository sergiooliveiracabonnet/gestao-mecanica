import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Feature 2 (IAM) introduz autenticação — CORS agora restrito a uma lista
  // explícita de origens em vez de wildcard.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
