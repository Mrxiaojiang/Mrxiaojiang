import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SuggestionCategory } from '../travel-suggestion.entity';

export class CreateTravelSuggestionDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(SuggestionCategory)
  category: SuggestionCategory;

  @IsOptional()
  @IsString()
  destination?: string;
}
