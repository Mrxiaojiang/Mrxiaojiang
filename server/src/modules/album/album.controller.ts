import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('相册')
@Controller('albums')
export class AlbumController {
  constructor(private albumService: AlbumService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '公开相册列表' })
  async findAllPublic(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.albumService.findAllPublic(+page, +limit);
    return { data, total };
  }

  @Public()
  @Get('top-liked')
  @ApiOperation({ summary: 'TOP10 点赞相册（Redis ZSET 排行）' })
  findTopLiked() {
    return this.albumService.findTopLiked();
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: '搜索公开相册' })
  search(@Query('keyword') keyword: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.albumService.search(keyword, +page, +limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: '我的相册' })
  findMyAlbums(@CurrentUser('id') userId: string) {
    return this.albumService.findMyAlbums(userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '相册详情（含私密，登录后可看自己的）' })
  findById(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.albumService.findById(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: '创建相册' })
  create(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.albumService.create({ ...data, user_id: userId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: '编辑相册' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.albumService.update(id, data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: '删除相册' })
  remove(@Param('id') id: string) {
    return this.albumService.softDelete(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  @ApiOperation({ summary: '点赞/取消点赞相册' })
  toggleLike(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.albumService.toggleLike(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/like-status')
  @ApiOperation({ summary: '查询点赞状态' })
  getLikeStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.albumService.getLikeStatus(id, userId);
  }
}
