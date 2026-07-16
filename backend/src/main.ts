import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppErrorCode } from './shared/errors/app-error-code';
import { AppException } from './shared/errors/app-exception';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Feature 2 (IAM) introduz autenticação — CORS agora restrito a uma lista
  // explícita de origens em vez de wildcard.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Converte os erros do class-validator para o formato
      // `{ error: { details: [{ field, message }] } }` que o frontend espera
      // (regra API_ERROR_MESSAGES).
      exceptionFactory: (errors) => {
        const details = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map((message) => ({ field: error.property, message })),
        );
        return new AppException(AppErrorCode.VALIDATION_ERROR, 'Dados inválidos.', HttpStatus.BAD_REQUEST, details);
      },
    }),
  );

  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
