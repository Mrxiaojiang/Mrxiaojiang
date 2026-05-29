import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('博客')
@Controller('blogs')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '博客列表' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [data, total] = await this.blogService.findAll(+page, +limit);
    return { data, total };
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: '精选博客' })
  findFeatured() {
    return this.blogService.findFeatured();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '博客详情' })
  findById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: '创建博客' })
  create(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.blogService.create({ ...data, author_id: userId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: '编辑博客' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.blogService.update(id, data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: '删除博客' })
  remove(@Param('id') id: string) {
    return this.blogService.softDelete(id);
  }
}
