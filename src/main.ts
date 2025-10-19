// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Puerto backend por defecto: 5000 (liberamos 3000 para el frontend)
  const port = Number(process.env.PORT) || 5000;

  app.enableCors({
    origin: [
      'http://localhost:3000', // frontend
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Key'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Prefijo global
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  console.log(`🌐 Global prefix habilitado: /${globalPrefix}`);

  // Swagger (+ server dinámico apuntando al nuevo puerto)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Servicios API')
    .setDescription('API para auth, users, providers, catalog, requests')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${port}/${globalPrefix}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📚 Swagger listo en /${globalPrefix}/docs`);
  }

  if (process.env.GENERATE_OPENAPI === 'true') {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const outDir = join(process.cwd(), 'docs');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
    console.log('📝 OpenAPI exportado a docs/openapi.json');
  }

  // Healthcheck accesible con y sin prefijo
  const adapter: any = app.getHttpAdapter();
  const healthHandler = (req: any, res: any) => {
    const body = { ok: true, prefix: `/${globalPrefix}`, ts: new Date().toISOString() };
    if (adapter && typeof adapter.reply === 'function') adapter.reply(res, body, 200);
    else if (res?.json) res.json(body);
    else res.end(JSON.stringify(body));
  };
  if (adapter && typeof adapter.get === 'function') {
    adapter.get('/health', healthHandler);
    adapter.get(`/${globalPrefix}/health`, healthHandler);
  }

  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
