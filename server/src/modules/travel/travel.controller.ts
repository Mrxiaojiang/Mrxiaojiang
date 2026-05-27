import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TravelService } from './travel.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('旅游')
@Controller('travel')
export class TravelController {
  constructor(private travelService: TravelService) {}

  // ─── 旅游计划 ─────────────────────────────────────────
  @Public()
  @Get('plans')
  @ApiOperation({ summary: '公开旅游计划' })
  findAllPlans(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.travelService.findAllPublicPlans(+page, +limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('plans/my')
  @ApiOperation({ summary: '我的旅游计划' })
  findMyPlans(@CurrentUser('id') userId: string) {
    return this.travelService.findMyPlans(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('plans')
  @ApiOperation({ summary: '创建旅游计划' })
  createPlan(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.travelService.createPlan({ ...data, user_id: userId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('plans/:id')
  @ApiOperation({ summary: '编辑旅游计划' })
  updatePlan(@Param('id') id: string, @Body() data: any) {
    return this.travelService.updatePlan(id, data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('plans/:id')
  @ApiOperation({ summary: '删除旅游计划' })
  removePlan(@Param('id') id: string) {
    return this.travelService.deletePlan(id);
  }

  // ─── 旅游建议 ─────────────────────────────────────────
  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: '旅游建议列表' })
  findAllSuggestions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') category?: string,
  ) {
    return this.travelService.findAllSuggestions(+page, +limit, category);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('suggestions')
  @ApiOperation({ summary: '创建旅游建议' })
  createSuggestion(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.travelService.createSuggestion({ ...data, user_id: userId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('suggestions/:id')
  @ApiOperation({ summary: '删除旅游建议' })
  removeSuggestion(@Param('id') id: string) {
    return this.travelService.deleteSuggestion(id);
  }

  // ─── 旅游定制 ─────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('customize')
  @ApiOperation({ summary: '旅游定制' })
  customize(@Body() data: { origin: string; stopovers: { name: string; duration: string }[]; destination: string }) {
    return this.travelService.customize(data);
  }
}
