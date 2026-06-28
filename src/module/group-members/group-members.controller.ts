import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { RequireGroupRole } from '../../common/decorators/group-role.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GroupMembersService } from './group-members.service';

@ApiTags('group-members')
@ApiBearerAuth()
@Controller('groups/:groupId/members')
export class GroupMembersController {
    constructor(private readonly groupMembersService: GroupMembersService) {}

    @Get()
    @RequireGroupRole(GroupRole.PARTICIPANT)
    @ApiOkResponse({ description: 'List of members in the group' })
    list(@Param('groupId') groupId: string) {
        return this.groupMembersService.listMembers(groupId);
    }

    @Patch(':userId/role')
    @RequireGroupRole(GroupRole.ADMIN)
    @ApiOkResponse({ description: 'Updated group member role' })
    updateRole(
        @Param('groupId') groupId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.groupMembersService.updateRole(groupId, userId, dto.role);
    }

    @Delete(':userId')
    @RequireGroupRole(GroupRole.ADMIN)
    @ApiOkResponse({ description: 'Removed member from the group' })
    remove(@Param('groupId') groupId: string, @Param('userId') userId: string) {
        return this.groupMembersService.removeMember(groupId, userId);
    }
}
