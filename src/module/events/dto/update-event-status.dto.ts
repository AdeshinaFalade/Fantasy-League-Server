import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum EventStatusDto {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    SCORING = 'SCORING',
    COMPLETED = 'COMPLETED',
}

export class UpdateEventStatusDto {
    @ApiProperty({ enum: EventStatusDto })
    @IsEnum(EventStatusDto)
    status!: EventStatusDto;
}
