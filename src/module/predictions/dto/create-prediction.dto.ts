import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SelectionDto {
    @ApiProperty({
        description: 'The ID of the rule this selection is predicting on. Fetch rule IDs from GET /rules/event/:id',
        example: 'cmr0u1zei0001ahzux36jel7r',
    })
    @IsString()
    ruleId!: string;

    @ApiProperty({
        description: 'true = predicting the condition WILL be met, false = predicting it will NOT be met',
        example: true,
    })
    @IsBoolean()
    value!: boolean;
}

export class CreatePredictionDto {
    @ApiProperty()
    @IsString()
    eventId!: string;

    @ApiProperty()
    @IsString()
    groupId!: string;

    @ApiProperty({
        description: 'One entry per rule the user is predicting on. Use GET /rules/event/:id to get available ruleIds.',
        type: [SelectionDto],
        example: [
            { ruleId: 'cmr0u1zei0001ahzux36jel7r', value: true },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SelectionDto)
    selections!: SelectionDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
