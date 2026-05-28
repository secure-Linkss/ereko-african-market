import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

const expressApp = express();
let app: any;

async function bootstrap() {
  if (app) return expressApp;

  // Stripe raw body must come before body parsers
  expressApp.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

  app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const origins = (configService.get('cors.origins') as string[]) ?? ['*'];

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());

  // Vercel uses extended:false query parser — bracket notation like filter[in_stock]=true
  // is NOT auto-parsed into nested objects. This middleware converts it before validation.
  expressApp.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
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
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.init();
  return expressApp;
}

export default async (req: express.Request, res: express.Response) => {
  const server = await bootstrap();
  server(req, res);
};
