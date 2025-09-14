// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // CORS (útil para el front)
  app.enableCors({ origin: true, credentials: true });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ---- Swagger: config + document (siempre generamos el document) ----
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Servicios API')
    .setDescription('API para auth, users, providers, catalog, requests')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // UI sólo fuera de producción
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log('📚 Swagger listo en http://localhost:3000/docs');
  }

  // Exportar OpenAPI a archivo si se solicita
  if (process.env.GENERATE_OPENAPI === 'true') {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const outDir = join(process.cwd(), 'docs');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
    console.log('📝 OpenAPI exportado a docs/openapi.json');
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();
