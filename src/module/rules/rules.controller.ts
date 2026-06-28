import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { CreateRuleDto } from './dto/create-rule.dto';
import { RulesService } from './rules.service';

@ApiTags('rules')
@ApiBearerAuth()
@Controller('rules')
export class RulesController {
    constructor(private readonly rulesService: RulesService) { }

    @Post()
    @ApiOkResponse()
    create(@Session() session: { user?: { id?: string } }, @Body() dto: CreateRuleDto) {
        return this.rulesService.create(session.user?.id ?? '', dto);
    }

    @Get('event/:id')
    @ApiOkResponse()
    listByEvent(@Param('id') id: string) {
        return this.rulesService.listByEvent(id);
    }

    @Delete(':id')
    @ApiOkResponse()
    remove(@Param('id') id: string) {
        return this.rulesService.remove(id);
    }
}
