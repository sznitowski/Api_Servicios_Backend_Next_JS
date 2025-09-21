// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableCors({ origin: true, credentials: true });

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
    const body = {
      ok: true,
      prefix: `/${globalPrefix}`,
      ts: new Date().toISOString(),
    };
    if (adapter && typeof adapter.reply === 'function') {
      adapter.reply(res, body, 200);
    } else if (res?.json) {
      res.json(body);
    } else {
      res.end(JSON.stringify(body));
    }
  };

  if (adapter && typeof adapter.get === 'function') {
    adapter.get('/health', healthHandler);                      // sin prefijo
    adapter.get(`/${globalPrefix}/health`, healthHandler);      // con prefijo
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
