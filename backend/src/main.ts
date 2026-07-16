import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { stringToSnakeCase } from '@oficina/contracts';
import { AppModule } from './app.module';
import { AppErrorCode } from './shared/errors/app-error-code';
import { AppException } from './shared/errors/app-exception';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { snakeToCamelMiddleware } from './shared/middleware/snake-to-camel.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Feature 2 (IAM) introduz autenticação — CORS agora restrito a uma lista
  // explícita de origens em vez de wildcard.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins });

  // snake_case (rede) -> camelCase (DTOs) ANTES do ValidationPipe;
  // camelCase -> snake_case na volta é o CaseConversionInterceptor global
  // (ver app.module.ts).
  app.use(snakeToCamelMiddleware);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Converte os erros do class-validator para o formato
      // `{ error: { details: [{ field, message }] } }` que o frontend espera
      // (regra API_ERROR_MESSAGES). `field` volta em snake_case, como o
      // corpo da requisição que o frontend enviou.
      exceptionFactory: (errors) => {
        const details = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map((message) => ({
            field: stringToSnakeCase(error.property),
            message,
          })),
        );
        return new AppException(AppErrorCode.VALIDATION_ERROR, 'Dados inválidos.', HttpStatus.BAD_REQUEST, details);
      },
    }),
  );

  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
