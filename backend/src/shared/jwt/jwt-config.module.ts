import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// @Global(): JwtService fica disponível para o JwtAuthGuard (registrado no
// AppModule) e para o TokenService (dentro do IamModule) sem precisar
// registrar o JwtModule duas vezes com configs que poderiam divergir.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: false,
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Segundos (número), não string tipo "15m" — evita briga de tipos
          // com o union `StringValue` da lib `ms` usada por @nestjs/jwt.
          expiresIn: config.get<number>('JWT_ACCESS_TOKEN_TTL_SECONDS', 900),
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
