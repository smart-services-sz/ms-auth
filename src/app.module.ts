import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MunicipalitiesModule } from './municipalities/municipalities.module';
import { AuditLoggingModule } from './audit/audit-logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    MunicipalitiesModule,
    AuditLoggingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
