import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
@Injectable()
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly logger = new Logger(LeaderboardGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: BetterAuthService,
    ) {}

    afterInit(server: Server) {
        server.use(async (socket: Socket, next) => {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.query?.token;

            if (!token) {
                return next(new Error('Authentication token missing'));
            }

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${token}`);

            try {
                const sessionContext = await this.authService.api.getSession({ headers });
                if (!sessionContext?.user) {
                    return next(new Error('Authentication failed'));
                }
                socket.data = socket.data || {};
                socket.data.user = sessionContext.user;
                next();
            } catch (err) {
                this.logger.error(`Error authenticating token in socket.io middleware: ${err}`);
                return next(new Error('Authentication failed'));
            }
        });
    }

    handleConnection(client: Socket) {
        const user = client.data?.user;
        this.logger.log(`Client connected: ${client.id} (User: ${user?.email})`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinGroup')
    async handleJoinGroup(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { groupId: string },
    ) {
        const user = client.data?.user;
        if (!user) {
            this.logger.warn(`Unauthorized joinGroup attempt: No user on socket ${client.id}`);
            client.disconnect(true);
            return;
        }

        const { groupId } = data;
        if (!groupId) {
            return { event: 'error', data: 'GroupId is required' };
        }

        // Verify membership
        const membership = await (this.prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            this.logger.warn(`Unauthorized room join attempt: User ${user.email} -> Group ${groupId}`);
            return { event: 'error', data: 'Not a member of this group' };
        }

        const roomName = `group_${groupId}`;
        client.join(roomName);
        this.logger.log(`User ${user.email} joined WebSocket room: ${roomName}`);
        return { event: 'joined', data: roomName };
    }

    emitLeaderboardUpdate(groupId: string, rankings: any) {
        if (!this.server) {
            this.logger.warn(`WebSocket server is not initialized. Skipping broadcast for group: ${groupId}`);
            return;
        }
        const roomName = `group_${groupId}`;
        this.server.to(roomName).emit('leaderboardUpdated', rankings);
        this.logger.log(`Emitted leaderboardUpdated event for group: ${groupId}`);
    }
}
