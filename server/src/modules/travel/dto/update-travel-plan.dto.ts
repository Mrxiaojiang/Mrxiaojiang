import { PartialType } from '@nestjs/swagger';
import { CreateTravelPlanDto } from './create-travel-plan.dto';

export class UpdateTravelPlanDto extends PartialType(CreateTravelPlanDto) {}
