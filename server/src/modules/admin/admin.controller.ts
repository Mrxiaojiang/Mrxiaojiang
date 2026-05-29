import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('后台管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '仪表盘统计' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── 用户管理 ─────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  async findAllUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.adminService.findAllUsers(+page, +limit);
    return { data, total };
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: '启用/禁用用户' })
  toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  // ─── 博客管理 ─────────────────────────────────────────
  @Get('blogs')
  @ApiOperation({ summary: '博客列表' })
  async findAllBlogs(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.adminService.findAllBlogs(+page, +limit);
    return { data, total };
  }

  @Put('blogs/:id/pin')
  @ApiOperation({ summary: '置顶/取消置顶' })
  toggleBlogPin(@Param('id') id: string) {
    return this.adminService.toggleBlogPin(id);
  }

  @Put('blogs/:id/feature')
  @ApiOperation({ summary: '推荐/取消推荐' })
  toggleBlogFeatured(@Param('id') id: string) {
    return this.adminService.toggleBlogFeatured(id);
  }

  @Delete('blogs/:id')
  @ApiOperation({ summary: '删除博客' })
  deleteBlog(@Param('id') id: string) {
    return this.adminService.deleteBlog(id);
  }

  // ─── 帖子管理 ─────────────────────────────────────────
  @Get('posts')
  @ApiOperation({ summary: '帖子列表' })
  async findAllPosts(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.adminService.findAllPosts(+page, +limit);
    return { data, total };
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '删除帖子' })
  deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  // ─── 评论管理 ─────────────────────────────────────────
  @Get('comments')
  @ApiOperation({ summary: '评论列表' })
  async findAllComments(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.adminService.findAllComments(+page, +limit);
    return { data, total };
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  deleteComment(@Param('id') id: string) {
    return this.adminService.deleteComment(id);
  }

  // ─── 相册管理 ─────────────────────────────────────────
  @Get('albums')
  @ApiOperation({ summary: '相册列表' })
  async findAllAlbums(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.adminService.findAllAlbums(+page, +limit);
    return { data, total };
  }

  @Delete('albums/:id')
  @ApiOperation({ summary: '删除相册' })
  deleteAlbum(@Param('id') id: string) {
    return this.adminService.deleteAlbum(id);
  }

  // ─── 热点事件 ─────────────────────────────────────────
  @Public()
  @Get('hot-events')
  @ApiOperation({ summary: '热点事件列表' })
  findAllHotEvents() {
    return this.adminService.findAllHotEvents();
  }

  @Post('hot-events')
  @ApiOperation({ summary: '创建热点事件' })
  createHotEvent(@Body() data: any) {
    return this.adminService.createHotEvent(data);
  }

  @Put('hot-events/:id')
  @ApiOperation({ summary: '编辑热点事件' })
  updateHotEvent(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateHotEvent(id, data);
  }

  @Delete('hot-events/:id')
  @ApiOperation({ summary: '删除热点事件' })
  deleteHotEvent(@Param('id') id: string) {
    return this.adminService.deleteHotEvent(id);
  }

  // ─── 系统设置 ─────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: '获取系统设置' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: '更新系统设置' })
  updateSettings(@Body() data: Record<string, string>) {
    return this.adminService.updateSettings(data);
  }
}
