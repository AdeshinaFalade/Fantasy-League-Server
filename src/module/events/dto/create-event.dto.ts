import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
