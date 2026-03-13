import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NatsModule } from 'src/nats/nats.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { TokenService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuditPublisher } from 'src/utils/audit.publisher';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    NatsModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        const ttl = Number(config.get<string>('ACCESS_TOKEN_TTL'));

        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET not defined');
        }

        if (!ttl) {
          throw new Error('ACCESS_TOKEN_TTL not defined');
        }

        return {
          secret,
          signOptions: {
            expiresIn: ttl, 
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    RefreshTokenService,
    AuditPublisher,
  ],
})
export class AuthModule {}
