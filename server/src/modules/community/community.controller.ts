import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LikeTargetType } from './like-record.entity';

@ApiTags('社区')
@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  // ─── 帖子 ─────────────────────────────────────────────
  @Public()
  @Get('posts')
  @ApiOperation({ summary: '帖子列表' })
  async findAllPosts(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.communityService.findAllPosts(+page, +limit);
    return { data, total };
  }

  @Public()
  @Get('posts/:id')
  @ApiOperation({ summary: '帖子详情' })
  findPostById(@Param('id') id: string) {
    return this.communityService.findPostById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('posts')
  @ApiOperation({ summary: '创建帖子' })
  createPost(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.communityService.createPost({ ...data, author_id: userId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id')
  @ApiOperation({ summary: '删除帖子' })
  removePost(@Param('id') id: string) {
    return this.communityService.softDeletePost(id);
  }

  // ─── 评论 ─────────────────────────────────────────────
  @Public()
  @Get('posts/:id/comments')
  @ApiOperation({ summary: '获取评论列表' })
  findComments(@Param('id') postId: string) {
    return this.communityService.findCommentsByPost(postId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  @ApiOperation({ summary: '添加评论' })
  createComment(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body() data: any) {
    return this.communityService.createComment({ ...data, author_id: userId, post_id: postId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  removeComment(@Param('id') id: string) {
    return this.communityService.softDeleteComment(id);
  }

  // ─── 点赞 ─────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/like')
  @ApiOperation({ summary: '点赞/取消帖子' })
  likePost(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.communityService.toggleLike(userId, LikeTargetType.POST, postId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/like')
  @ApiOperation({ summary: '点赞/取消评论' })
  likeComment(@CurrentUser('id') userId: string, @Param('id') commentId: string) {
    return this.communityService.toggleLike(userId, LikeTargetType.COMMENT, commentId);
  }
}
