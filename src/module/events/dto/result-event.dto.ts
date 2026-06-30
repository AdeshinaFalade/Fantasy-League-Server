import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class ResultEventDto {
    @ApiProperty({
        description: 'The ID of the event this result belongs to',
        example: 'cmr0u03rj0000ahzuckre2sya',
    })
    @IsString()
    eventId!: string;

    @ApiProperty({
        description:
            'Actual match stats keyed by player name, then by metric name. ' +
            'Every player+metric combination referenced by the event rules must be present.',
        example: {
            Ronaldo: { Goal: 2, Assist: 1 },
            Messi: { Goal: 1, Assist: 3 },
        },
        additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'number' },
        },
    })
    @IsObject()
    payload!: Record<string, Record<string, number>>;
}
