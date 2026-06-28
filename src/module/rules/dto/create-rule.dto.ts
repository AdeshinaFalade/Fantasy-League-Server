import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export enum RuleConditionDto {
    GT = 'GT',
    LT = 'LT',
    EQ = 'EQ',
    GTE = 'GTE',
    LTE = 'LTE',
    NEQ = 'NEQ',
}

export class CreateRuleDto {
    @ApiProperty()
    @IsString()
    eventId!: string;

    @ApiProperty()
    @IsString()
    player!: string;

    @ApiProperty()
    @IsString()
    metric!: string;

    @ApiProperty({ enum: RuleConditionDto })
    @IsEnum(RuleConditionDto)
    condition!: RuleConditionDto;

    @ApiProperty()
    @IsNumber()
    threshold!: number;

    @ApiProperty()
    @IsNumber()
    score!: number;
}
