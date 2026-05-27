import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Blog } from '../blog/blog.entity';
import { CommunityPost } from '../community/community-post.entity';
import { Comment } from '../community/comment.entity';
import { Album } from '../album/album.entity';
import { HotEvent } from './hot-event.entity';
import { SiteSetting } from './site-setting.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Blog, CommunityPost, Comment, Album, HotEvent, SiteSetting]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
