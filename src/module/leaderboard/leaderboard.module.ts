import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardConsumer } from './leaderboard.consumer';

@Module({
    controllers: [LeaderboardController],
    providers: [LeaderboardService, LeaderboardConsumer],
    exports: [LeaderboardService],
})
export class LeaderboardModule { }
