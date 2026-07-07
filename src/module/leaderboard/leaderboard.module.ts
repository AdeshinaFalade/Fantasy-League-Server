import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardConsumer } from './leaderboard.consumer';
import { LeaderboardGateway } from './leaderboard.gateway';

@Module({
    controllers: [LeaderboardController],
    providers: [LeaderboardService, LeaderboardConsumer, LeaderboardGateway],
    exports: [LeaderboardService, LeaderboardGateway],
})
export class LeaderboardModule { }

