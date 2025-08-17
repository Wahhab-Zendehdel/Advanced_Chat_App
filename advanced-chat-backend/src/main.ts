import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Make sure your .pem files are in the root of the backend project
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'localhost+3-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'localhost+3.pem')),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  app.enableCors(); // <-- ADD THIS LINE to allow requests from the frontend
  app.useWebSocketAdapter(new WsAdapter(app));
  
  await app.listen(3001);
  console.log('NestJS backend is running securely on https://localhost:3001');
}
bootstrap();
