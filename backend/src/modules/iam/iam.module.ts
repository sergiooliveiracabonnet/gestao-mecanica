import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { AuthManager } from './managers/auth.manager';
import { UserManager } from './managers/user.manager';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RoleRepository } from './repositories/role.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { DocumentValidatorService } from './services/document-validator.service';

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthManager,
    UserManager,
    TenantRepository,
    UserRepository,
    RefreshTokenRepository,
    RoleRepository,
    PasswordService,
    TokenService,
    DocumentValidatorService,
  ],
})
export class IamModule {}
