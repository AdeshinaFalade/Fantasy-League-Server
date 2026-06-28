import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class JoinGroupDto {
    @ApiProperty()
    @IsString()
    inviteCode!: string;
}
