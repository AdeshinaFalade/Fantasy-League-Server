import { SetMetadata } from '@nestjs/common';
import { GroupRole } from '@prisma/client';

export const REQUIRE_GROUP_ROLE_KEY = 'group-role';
export const RequireGroupRole = (role: GroupRole) => SetMetadata(REQUIRE_GROUP_ROLE_KEY, role);
