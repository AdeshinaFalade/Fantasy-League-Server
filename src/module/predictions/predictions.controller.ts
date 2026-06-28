import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@ApiBearerAuth()
@Controller('predictions')
export class PredictionsController {
    constructor(private readonly predictionsService: PredictionsService) { }

    @Post()
    @ApiOkResponse()
    create(@Session() session: { user?: { id?: string } }, @Body() dto: CreatePredictionDto) {
        return this.predictionsService.create(session.user?.id ?? '', dto);
    }

    @Get('event/:id')
    @ApiOkResponse()
    listByEvent(@Param('id') eventId: string) {
        return this.predictionsService.listByEvent(eventId);
    }

    @Get('me')
    @ApiOkResponse()
    listMine(@Session() session: { user?: { id?: string } }) {
        return this.predictionsService.listMine(session.user?.id ?? '');
    }
}
