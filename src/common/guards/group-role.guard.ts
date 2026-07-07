import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GroupRole } from '@prisma/client';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../../lib/database/prisma.service';
import { REQUIRE_GROUP_ROLE_KEY } from '../decorators/group-role.decorator';

@Injectable()
export class GroupRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly authService: BetterAuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Only apply guard to HTTP requests
        if (context.getType() !== 'http') {
            return true;
        }

        const requiredRole = this.reflector.getAllAndOverride<GroupRole>(
            REQUIRE_GROUP_ROLE_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no role check is required, allow access
        if (!requiredRole) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        let user = request.user;
        if (!user) {
            try {
                const headers = new Headers();
                for (const [key, value] of Object.entries(request.headers || {})) {
                    if (value) {
                        if (Array.isArray(value)) {
                            value.forEach(v => headers.append(key, v));
                        } else {
                            headers.set(key, value as string);
                        }
                    }
                }
                const sessionContext = await this.authService.api.getSession({ headers });
                if (sessionContext) {
                    request.user = sessionContext.user;
                    request.session = sessionContext.session;
                    user = sessionContext.user;
                }
            } catch (err) {
                console.error('Failed to parse session in GroupRoleGuard:', err);
            }
        }

        if (!user) {
            throw new UnauthorizedException('Authentication required');
        }

        const groupId = await this.resolveGroupId(request);
        if (!groupId) {
            throw new ForbiddenException('Could not resolve group context');
        }

        const membership = await (this.prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            throw new ForbiddenException('User is not a member of the group');
        }

        if (requiredRole === GroupRole.ADMIN && membership.role !== GroupRole.ADMIN) {
            throw new ForbiddenException('Admin role required in this group');
        }

        return true;
    }

    private async resolveGroupId(request: any): Promise<string | null> {
        const params = request.params || {};
        const body = request.body || {};
        const path = request.path || '';

        // 1. Explicit groupId in params or body
        if (params.groupId) return params.groupId;
        if (body.groupId) return body.groupId;

        // 2. Route is /groups/:id - id is groupId
        if (path.startsWith('/groups/') && params.id) {
            return params.id;
        }

        // 3. Explicit eventId in body or params
        let eventId = body.eventId || params.eventId;
        if (!eventId && path.startsWith('/events/') && params.id && !path.endsWith('/result')) {
            eventId = params.id;
        }

        if (eventId) {
            const event = await (this.prisma as any).event.findUnique({
                where: { id: eventId },
                select: { groupId: true },
            });
            if (event) return event.groupId;
        }

        // 4. Explicit ruleId in params or body
        let ruleId = body.ruleId || params.ruleId;
        if (!ruleId && path.startsWith('/rules/') && params.id) {
            ruleId = params.id;
        }

        if (ruleId) {
            const rule = await (this.prisma as any).rule.findUnique({
                where: { id: ruleId },
                select: {
                    event: {
                        select: { groupId: true },
                    },
                },
            });
            if (rule?.event) return rule.event.groupId;
        }

        // 5. Prediction context
        let predictionId = body.predictionId || params.predictionId;
        if (!predictionId && path.startsWith('/predictions/') && params.id) {
            predictionId = params.id;
        }

        if (predictionId) {
            const prediction = await (this.prisma as any).prediction.findUnique({
                where: { id: predictionId },
                select: { groupId: true },
            });
            if (prediction) return prediction.groupId;
        }

        return null;
    }
}
