import { PartialType } from '@nestjs/swagger';
import { CreateTravelSuggestionDto } from './create-travel-suggestion.dto';

export class UpdateTravelSuggestionDto extends PartialType(CreateTravelSuggestionDto) {}
