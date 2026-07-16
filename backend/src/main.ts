import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { stringToSnakeCase } from '@oficina/contracts';
import { AppModule } from './app.module';
import { AppErrorCode } from './shared/errors/app-error-code';
import { AppException, type AppExceptionDetail } from './shared/errors/app-exception';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { snakeToCamelMiddleware } from './shared/middleware/snake-to-camel.middleware';

// class-validator aninha erros de objetos nested (ex: UserListDto.filters)
// em `error.children`, não em `error.constraints` do erro pai — sem
// recursão, um filtro inválido em `filters.status` produzia
// `details: []` e o usuário só via "Dados inválidos." genérico.
function flattenValidationErrors(errors: ValidationError[], parentPath = ''): AppExceptionDetail[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownDetails = Object.values(error.constraints ?? {}).map((message) => ({
      field: stringToSnakeCase(path),
      message,
    }));
    const childDetails = error.children?.length ? flattenValidationErrors(error.children, path) : [];
    return [...ownDetails, ...childDetails];
  });
}

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
        const details = flattenValidationErrors(errors);
        return new AppException(AppErrorCode.VALIDATION_ERROR, 'Dados inválidos.', HttpStatus.BAD_REQUEST, details);
      },
    }),
  );

  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
