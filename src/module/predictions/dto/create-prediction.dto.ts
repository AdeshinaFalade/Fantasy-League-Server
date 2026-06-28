import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePredictionDto {
    @ApiProperty()
    @IsString()
    eventId!: string;

    @ApiProperty()
    @IsString()
    groupId!: string;

    @ApiProperty()
    @IsArray()
    selections!: Array<Record<string, unknown>>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
