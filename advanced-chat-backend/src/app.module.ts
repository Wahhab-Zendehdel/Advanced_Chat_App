import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat.gateway';
import { PreviewController } from './preview.controller';

@Module({
  imports: [],
  controllers: [AppController, PreviewController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
