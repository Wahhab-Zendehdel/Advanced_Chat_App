// src/app.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MediasoupService } from './mediasoup.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PreviewController } from './preview.controller';

@Module({
  imports: [],
  controllers: [AppController, PreviewController],
  providers: [AppService, ChatGateway, MediasoupService], // <-- MediasoupService added here
})
export class AppModule {}