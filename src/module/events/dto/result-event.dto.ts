import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class ResultEventDto {
    @ApiProperty()
    @IsString()
    eventId!: string;

    @ApiProperty()
    @IsObject()
    payload!: Record<string, unknown>;
}
