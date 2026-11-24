import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// web origins allowed to call the API; requests without an Origin header (mobile app, server calls) are not affected
const DEFAULT_ORIGINS = ['https://499-ab-frontend.vercel.app'];
const FRONTEND_PREVIEW = /^https:\/\/499-ab-frontend[a-z0-9-]*\.vercel\.app$/;
// local development on any port, including the app's web build
const LOCAL_DEV = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigins(): Set<string> {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');
  return new Set([...DEFAULT_ORIGINS, ...fromEnv]);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // behind Render's proxy: use the caller's address for rate limits
  app.set('trust proxy', 1);
  // CSP off so the API docs page keeps working; images in /uploads can be shown on other sites
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const origins = allowedOrigins();
  app.enableCors({
    origin: (origin: string | undefined, done: (err: Error | null, allow?: boolean) => void) =>
      done(null, !origin || origins.has(origin) || FRONTEND_PREVIEW.test(origin) || LOCAL_DEV.test(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CityPulse API')
    .setDescription(
      'Backend API for the CityPulse intelligent parking platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
