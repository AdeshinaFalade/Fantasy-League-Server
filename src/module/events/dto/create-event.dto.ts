import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
    @ApiProperty()
    @IsString()
    groupId!: string;

    @ApiProperty()
    @IsString()
    name!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: '2026-07-01T12:00:00.000Z' })
    @IsDateString()
    startsAt!: string;
}
