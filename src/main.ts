import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS (optional, but handy for frontend later)
  app.enableCors({ origin: true, credentials: true });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Optional: API prefix & versioning
  // app.setGlobalPrefix('api');
  // app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();
