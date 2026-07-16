import { HttpException, HttpStatus } from '@nestjs/common';
import type { AppErrorCode } from './app-error-code';

export interface AppExceptionDetail {
  field: string;
  message: string;
}

// Exceção controlada — o HttpExceptionFilter global a serializa no formato
// `{ error: { code, message, status, details } }` esperado pelo frontend
// (regra API_ERROR_MESSAGES, comum a todos os projetos do usuário).
export class AppException extends HttpException {
  readonly code: AppErrorCode;
  readonly details?: AppExceptionDetail[];

  constructor(
    code: AppErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: AppExceptionDetail[],
  ) {
    super(message, status);
    this.code = code;
    this.details = details;
  }
}
