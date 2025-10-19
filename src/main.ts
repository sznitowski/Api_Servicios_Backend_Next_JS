// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

function parseOrigins(value?: string): string[] {
  if (!value) {
    // orígenes típicos de front en dev (Next/Vite) + loopback
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
  }
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // CORS una sola vez, controlado por env FRONTEND_ORIGINS si se necesita
  app.enableCors({
    origin: parseOrigins(process.env.FRONTEND_ORIGINS),
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
  console.log(`🌐 Global prefix: /${globalPrefix}`);

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Servicios API')
    .setDescription('API para auth, users, providers, catalog, requests')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📚 Swagger en /${globalPrefix}/docs`);
  }

  // Export opcional de OpenAPI
  if (process.env.GENERATE_OPENAPI === 'true') {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const outDir = join(process.cwd(), 'docs');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
    console.log('📝 OpenAPI exportado a docs/openapi.json');
  }

  // Healthcheck (con y sin prefijo)
  const adapter: any = app.getHttpAdapter();
  const healthHandler = (_req: any, res: any) => {
    const body = { ok: true, prefix: `/${globalPrefix}`, ts: new Date().toISOString() };
    if (adapter?.reply) adapter.reply(res, body, 200);
    else if (res?.json) res.json(body);
    else res.end(JSON.stringify(body));
  };
  if (adapter?.get) {
    adapter.get('/health', healthHandler);
    adapter.get(`/${globalPrefix}/health`, healthHandler);
  }

  // Nuevo puerto por defecto: 8000 (liberamos 3000 para el front)
  const port = Number(process.env.PORT) || 8000;
  await app.listen(port);
  console.log(`🚀 Server: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
