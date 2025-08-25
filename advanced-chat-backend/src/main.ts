// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Use the new certificate files for SARI.chat
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'SARI.chat-key.pem')), // <-- UPDATE THIS
    cert: fs.readFileSync(path.join(__dirname, '..', 'SARI.chat.pem')),    // <-- UPDATE THIS
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  app.enableCors();
  app.useWebSocketAdapter(new WsAdapter(app));
  
  await app.listen(3001);
  console.log('NestJS backend is running securely on https://localhost:3001');
}
bootstrap();