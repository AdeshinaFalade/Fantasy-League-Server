import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    @ApiOkResponse()
    create(@Session() session: { user?: { id?: string } }, @Body() dto: CreateGroupDto) {
        return this.groupsService.create(session.user?.id ?? '', dto);
    }

    @Post('join')
    @ApiOkResponse()
    join(@Session() session: { user?: { id?: string } }, @Body() dto: JoinGroupDto) {
        return this.groupsService.join(session.user?.id ?? '', dto);
    }

    @Get()
    @ApiOkResponse()
    list(@Session() session: { user?: { id?: string } }) {
        return this.groupsService.list(session.user?.id ?? '');
    }

    @Get(':id')
    @ApiOkResponse()
    findOne(@Param('id') id: string) {
        return this.groupsService.findOne(id);
    }

    @Delete(':id')
    @ApiOkResponse()
    remove(@Param('id') id: string) {
        return this.groupsService.remove(id);
    }
}
