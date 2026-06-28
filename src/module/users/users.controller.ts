import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me/groups')
    @ApiOkResponse({ description: 'List of groups joined by the current user' })
    getJoinedGroups(@Session() session: { user: { id: string } }) {
        return this.usersService.getJoinedGroups(session.user.id);
    }

    @Get('search')
    @ApiQuery({ name: 'q', required: true, description: 'Search term for user name or email' })
    @ApiOkResponse({ description: 'List of matching users' })
    search(@Query('q') query: string) {
        return this.usersService.search(query || '');
    }

    @Get(':id')
    @ApiOkResponse({ description: 'Detailed user profile' })
    findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }
}
