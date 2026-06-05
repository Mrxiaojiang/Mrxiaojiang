import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { Album } from './album.entity';
import { AlbumController } from './album.controller';
import { AlbumService } from './album.service';

@Module({
  imports: [TypeOrmModule.forFeature([Album]), NotificationModule],
  controllers: [AlbumController],
  providers: [AlbumService],
  exports: [AlbumService],
})
export class AlbumModule {}
