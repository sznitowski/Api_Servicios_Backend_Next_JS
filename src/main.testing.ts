// src/main.testing.ts
import { NestFactory } from '@nestjs/core';
import { AppTestingModule } from '../test/support/app.testing.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppTestingModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
  }));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();