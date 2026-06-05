import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateTravelPlanDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsObject()
  itinerary?: Record<string, any>;
}
