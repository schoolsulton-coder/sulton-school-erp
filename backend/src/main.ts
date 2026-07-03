import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    // Production: aniq FRONTEND_URL. Dev: har qanday localhost porti (3000/3005/...).
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL ?? true)
        : [/^http:\/\/localhost:\d+$/],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger — API hujjatlari: /api/docs (faqat production EMAS muhitda)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Sulton School ERP & LMS API')
      .setDescription('Maktab boshqaruvi platformasi REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 API ishga tushdi: http://localhost:${port}/api`);
}
bootstrap();
