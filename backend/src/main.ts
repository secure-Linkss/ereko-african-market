import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Preserve raw body for Stripe webhook signature verification
  app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3001;
  const origins = configService.get<string[]>('cors.origins');
  const nodeEnv = configService.get<string>('nodeEnv');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Rewrite bracket-notation query params before NestJS validation.
  // Vercel serverless uses extended:false so filter[in_stock] isn't parsed as nested.
  // This middleware converts { 'filter[key]': val } → { filter: { key: val } } early.
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const q = req.query as Record<string, any>;
    for (const rawKey of Object.keys(q)) {
      const m = rawKey.match(/^(\w+)\[(\w+)\]$/);
      if (m) {
        const [, parent, child] = m;
        if (!q[parent] || typeof q[parent] !== 'object') q[parent] = {};
        (q[parent] as Record<string, any>)[child] = q[rawKey];
        delete q[rawKey];
      }
    }
    next();
  });

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Accept'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EREKO Market API')
      .setDescription('African food e-commerce platform — enterprise backend API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addCookieAuth('refresh_token')
      .addServer(`http://localhost:${port}`, 'Local')
      .addServer('https://api.ereko.market', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  if (nodeEnv === 'production') {
    const defaultSecrets = ['changeme_access_secret', 'changeme_refresh_secret', 'changeme_mfa_secret'];
    const jwtAccess = configService.get<string>('jwt.accessSecret') ?? '';
    const jwtRefresh = configService.get<string>('jwt.refreshSecret') ?? '';
    if (defaultSecrets.includes(jwtAccess) || defaultSecrets.includes(jwtRefresh)) {
      throw new Error('FATAL: JWT secrets are using default values. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.');
    }
  }

  await app.listen(port);
  console.log(`EREKO backend running on http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
