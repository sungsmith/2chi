import { IsString, IsEnum, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsEnum(['DEADLINE', 'INTERVIEW', 'OTHER'])
  eventType!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}
