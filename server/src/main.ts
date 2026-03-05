import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/services/users.service';
import { BranchesService } from './modules/branches/services/branches.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET || '';

  if (!jwtSecret || jwtSecret === 'secretKey' || jwtSecret === 'my-very-secure-secret-key-for-development-2025') {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET must be set to a strong value in production');
    }
    logger.warn('Using default JWT secret for development. Set JWT_SECRET before production deployment.');
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allow larger JSON payloads for subscription payment proof uploads.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Basic security headers for browser clients.
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }
  app.use((_: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS - Handle multiple origins properly
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3004'];
    
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Swagger API Documentation (disabled in production unless explicitly enabled)
  if (nodeEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Rangoon F&B ERP POS API')
      .setDescription('Myanmar All-in-One ERP POS System')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const usersService = app.get(UsersService);
  const branchesService = app.get(BranchesService);
  await branchesService.ensureDefaultBranch();
  logger.log('Default branch ensured');
  await usersService.ensureDefaultAdmin();
  logger.log('Default superadmin ensured (user: admin)');

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  logger.log(`🚀 Rangoon F&B Server running on http://${host}:${port}`);
  logger.log(`📚 API Documentation: http://${host}:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
