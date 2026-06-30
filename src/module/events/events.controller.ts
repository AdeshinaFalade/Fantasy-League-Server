import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { CreateEventDto } from './dto/create-event.dto';
import { ResultEventDto } from './dto/result-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    @ApiOkResponse()
    create(@Session() session: { user?: { id?: string } }, @Body() dto: CreateEventDto) {
        return this.eventsService.create(session.user?.id ?? '', dto);
    }

    @Get('group/:groupId')
    @ApiOkResponse()
    findByGroup(
        @Session() session: { user?: { id?: string } },
        @Param('groupId') groupId: string,
    ) {
        return this.eventsService.findByGroup(session.user?.id ?? '', groupId);
    }

    @Get(':id')
    @ApiOkResponse()
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Patch(':id/status')
    @ApiOkResponse()
    setStatus(@Param('id') id: string, @Body() dto: UpdateEventStatusDto) {
        return this.eventsService.setStatus(id, dto.status);
    }

    @Post('result')
    @ApiOkResponse()
    recordResult(@Session() session: { user?: { id?: string } }, @Body() dto: ResultEventDto) {
        return this.eventsService.recordResult(session.user?.id ?? '', dto);
    }
}
