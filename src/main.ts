import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('MS-AUTH');

  const natsServer =
    process.env.NATS_SERVERS || 'nats://localhost:4222';

  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: [natsServer],
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen();

  console.log('DATABASE_URL raw:', process.env.DATABASE_URL);

  logger.log(`
  ----------------------------------------
    MS-AUTH STARTED
    NATS: ${natsServer}
    ENV : ${process.env.NODE_ENV}
  ----------------------------------------
  `);
}

bootstrap();
